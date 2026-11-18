const express = require('express')
const pool = require('../db')
const { verificarAdministrador } = require('../middlewares/autenticacion')
const { registrarTurno } = require('./turnos')

const router = express.Router()

// Proteger todas las rutas
router.use(verificarAdministrador)

// Consultar clientes registrados
router.get('/clientes', async (req, res) => {
  try {
    const [clientes] = await pool.execute(
      `SELECT
         id_cliente,
         nombre,
         apellido,
         telefono,
         correo_contacto
       FROM clientes
       ORDER BY apellido, nombre`
    )

    return res.json({ clientes })
  } catch (error) {
    console.error('Error al consultar clientes:', error)

    return res.status(500).json({
      mensaje: 'No se pudieron obtener los clientes.'
    })
  }
})

// Consultar vehículos de un cliente
router.get('/clientes/:id/vehiculos', async (req, res) => {
  const idCliente = Number(req.params.id)

  if (!Number.isSafeInteger(idCliente) || idCliente <= 0) {
    return res.status(400).json({
      mensaje: 'El identificador del cliente es inválido.'
    })
  }

  try {
    const [clientes] = await pool.execute(
      `SELECT id_cliente
       FROM clientes
       WHERE id_cliente = ?
       LIMIT 1`,
      [idCliente]
    )

    if (clientes.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el cliente.'
      })
    }

    const [vehiculos] = await pool.execute(
      `SELECT
         id_vehiculo,
         patente,
         marca,
         modelo
       FROM vehiculos
       WHERE id_cliente = ?
       ORDER BY patente`,
      [idCliente]
    )

    return res.json({ vehiculos })
  } catch (error) {
    console.error('Error al consultar vehículos:', error)

    return res.status(500).json({
      mensaje: 'No se pudieron obtener los vehículos.'
    })
  }
})

// Registrar una reserva presencial
router.post('/', async (req, res) => {
  const idCliente = Number(req.body?.id_cliente)

  if (!Number.isSafeInteger(idCliente) || idCliente <= 0) {
    return res.status(400).json({
      mensaje: 'Seleccioná un cliente válido.'
    })
  }

  try {
    // Comprobar que el cliente está registrado
    const [clientes] = await pool.execute(
      `SELECT id_cliente
       FROM clientes
       WHERE id_cliente = ?
       LIMIT 1`,
      [idCliente]
    )

    if (clientes.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el cliente.'
      })
    }

    // Indicar qué cliente y qué origen utilizar
    req.idCliente = idCliente
    req.origenTurno = 'presencial'

    // Reutilizar la creación de reservas online
    return registrarTurno(req, res)
  } catch (error) {
    console.error('Error al registrar reserva presencial:', error)

    return res.status(500).json({
      mensaje: 'No se pudo registrar la reserva presencial.'
    })
  }
})

module.exports = router
