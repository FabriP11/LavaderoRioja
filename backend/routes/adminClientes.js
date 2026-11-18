const express = require('express')
const pool = require('../db')
const { verificarAdministrador } = require('../middlewares/autenticacion')

const router = express.Router()

// Proteger todas las rutas
router.use(verificarAdministrador)

// Consultar todos los clientes
router.get('/', async (req, res) => {
  try {
    const [clientes] = await pool.execute(
      `SELECT
         c.id_cliente,
         c.nombre,
         c.apellido,
         c.telefono,
         c.correo_contacto,
         u.nombre_usuario,
         (SELECT COUNT(*)
          FROM vehiculos v
          WHERE v.id_cliente = c.id_cliente) AS total_vehiculos,
         (SELECT COUNT(*)
          FROM turnos t
          WHERE t.id_cliente = c.id_cliente) AS total_turnos
       FROM clientes c
       INNER JOIN usuarios u
         ON c.id_usuario = u.id_usuario
       ORDER BY c.apellido, c.nombre`
    )

    return res.json({ clientes })
  } catch (error) {
    console.error('Error al consultar clientes:', error)

    return res.status(500).json({
      mensaje: 'No se pudieron obtener los clientes.'
    })
  }
})

// Consultar los detalles de un cliente
router.get('/:id', async (req, res) => {
  const idCliente = Number(req.params.id)

  if (!Number.isSafeInteger(idCliente) || idCliente <= 0) {
    return res.status(400).json({
      mensaje: 'El identificador del cliente es inválido.'
    })
  }

  try {
    // Datos del cliente
    const [clientes] = await pool.execute(
      `SELECT
         c.id_cliente,
         c.nombre,
         c.apellido,
         c.telefono,
         c.correo_contacto,
         u.nombre_usuario,
         u.correo
       FROM clientes c
       LEFT JOIN usuarios u
         ON c.id_usuario = u.id_usuario
       WHERE c.id_cliente = ?
       LIMIT 1`,
      [idCliente]
    )

    if (clientes.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el cliente.'
      })
    }

    // Vehículos registrados
    const [vehiculos] = await pool.execute(
      `SELECT
         id_vehiculo,
         patente,
         marca,
         modelo
       FROM vehiculos
       WHERE id_cliente = ?
       ORDER BY id_vehiculo DESC`,
      [idCliente]
    )

    // Historial de reservas
    const [turnos] = await pool.execute(
      `SELECT
         t.id_turno,
         v.patente,
         s.nombre AS servicio,
         p.nombre AS puesto,
         DATE_FORMAT(
           t.fecha_hora_inicio,
           '%Y-%m-%d'
         ) AS fecha,
         DATE_FORMAT(
           t.fecha_hora_inicio,
           '%H:%i'
         ) AS hora_inicio,
         t.precio_aplicado,
         t.estado,
         t.origen
       FROM turnos t
       INNER JOIN vehiculos v
         ON t.id_vehiculo = v.id_vehiculo
       INNER JOIN servicios s
         ON t.id_servicio = s.id_servicio
       INNER JOIN puestos_lavado p
         ON t.id_puesto = p.id_puesto
       WHERE t.id_cliente = ?
       ORDER BY t.fecha_hora_inicio DESC`,
      [idCliente]
    )

    return res.json({
      cliente: clientes[0],
      vehiculos,
      turnos
    })
  } catch (error) {
    console.error('Error al consultar cliente:', error)

    return res.status(500).json({
      mensaje: 'No se pudo consultar la información del cliente.'
    })
  }
})

// Registrar un cliente presencial con su vehículo
router.post('/presencial', async (req, res) => {
  const { nombre, apellido, telefono, patente, marca, modelo } = req.body || {}

  // Validar los datos recibidos
  if (
    typeof nombre !== 'string' ||
    typeof apellido !== 'string' ||
    typeof telefono !== 'string' ||
    typeof patente !== 'string' ||
    typeof marca !== 'string' ||
    typeof modelo !== 'string'
  ) {
    return res.status(400).json({
      mensaje: 'Completá todos los datos solicitados.'
    })
  }

  const nombreLimpio = nombre.trim()
  const apellidoLimpio = apellido.trim()
  const telefonoLimpio = telefono.trim()
  const patenteLimpia = patente.trim().toUpperCase().replace(/[\s-]/g, '')
  const marcaLimpia = marca.trim()
  const modeloLimpio = modelo.trim()

  if (
    !nombreLimpio ||
    !apellidoLimpio ||
    nombreLimpio.length > 100 ||
    apellidoLimpio.length > 100
  ) {
    return res.status(400).json({
      mensaje: 'Ingresá un nombre y apellido válidos.'
    })
  }

  if (telefonoLimpio.length < 6 || telefonoLimpio.length > 30) {
    return res.status(400).json({
      mensaje: 'Ingresá un teléfono válido.'
    })
  }

  if (!/^[A-Z0-9]{6,10}$/.test(patenteLimpia)) {
    return res.status(400).json({
      mensaje: 'Ingresá una patente válida.'
    })
  }

  if (
    !marcaLimpia ||
    !modeloLimpio ||
    marcaLimpia.length > 50 ||
    modeloLimpio.length > 50
  ) {
    return res.status(400).json({
      mensaje: 'Ingresá una marca y modelo válidos.'
    })
  }

  let conexion

  try {
    conexion = await pool.getConnection()
    await conexion.beginTransaction()

    // Comprobar que la patente no esté registrada
    const [existentes] = await conexion.execute(
      `SELECT id_vehiculo
       FROM vehiculos
       WHERE patente = ?
       LIMIT 1`,
      [patenteLimpia]
    )

    if (existentes.length > 0) {
      await conexion.rollback()

      return res.status(409).json({
        mensaje: 'Esta patente ya está registrada.'
      })
    }

    // Crear cliente sin cuenta web
    const [resultadoCliente] = await conexion.execute(
      `INSERT INTO clientes
       (id_usuario, nombre, apellido, telefono, correo_contacto)
       VALUES (NULL, ?, ?, ?, NULL)`,
      [nombreLimpio, apellidoLimpio, telefonoLimpio]
    )

    const idCliente = resultadoCliente.insertId

    // Registrar su vehículo
    const [resultadoVehiculo] = await conexion.execute(
      `INSERT INTO vehiculos
       (id_cliente, patente, marca, modelo)
       VALUES (?, ?, ?, ?)`,
      [idCliente, patenteLimpia, marcaLimpia, modeloLimpio]
    )

    await conexion.commit()

    return res.status(201).json({
      mensaje: 'Cliente y vehículo registrados correctamente.',
      cliente: {
        id_cliente: idCliente,
        nombre: nombreLimpio,
        apellido: apellidoLimpio,
        telefono: telefonoLimpio
      },
      vehiculo: {
        id_vehiculo: resultadoVehiculo.insertId,
        patente: patenteLimpia,
        marca: marcaLimpia,
        modelo: modeloLimpio
      }
    })
  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback()
      } catch (errorRollback) {
        console.error('Error al revertir registro:', errorRollback)
      }
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Esta patente ya está registrada.'
      })
    }

    console.error('Error al registrar cliente presencial:', error)

    return res.status(500).json({
      mensaje: 'No se pudo registrar el cliente.'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
})

module.exports = router
