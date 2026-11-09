const express = require('express')
const pool = require('../db')
const { verificarCliente } = require('../middlewares/autenticacion')

const router = express.Router()

// Obtener vehículos del cliente
router.get('/', verificarCliente, async (req, res) => {
  try {
    const [vehiculos] = await pool.execute(
      `SELECT *
       FROM vehiculos
       WHERE id_cliente = ?
       ORDER BY id_vehiculo DESC`,
      [req.idCliente]
    )

    res.json({ vehiculos })
  } catch (error) {
    console.error('Error al consultar vehículos:', error)

    res.status(500).json({
      mensaje: 'No se pudieron obtener los vehículos.'
    })
  }
})

// Registrar un nuevo vehículo para el cliente
router.post('/', verificarCliente, async (req, res) => {
  const { patente, marca, modelo } = req.body || {}

  // Validar tipos de datos
  if (
    typeof patente !== 'string' ||
    typeof marca !== 'string' ||
    typeof modelo !== 'string'
  ) {
    return res.status(400).json({
      mensaje: 'Completá todos los datos del vehículo.'
    })
  }

  // Limpiar los datos
  const patenteLimpia = patente.trim().toUpperCase().replace(/[\s-]/g, '')

  const marcaLimpia = marca.trim()
  const modeloLimpio = modelo.trim()

  if (!marcaLimpia || !modeloLimpio) {
    return res.status(400).json({
      mensaje: 'La marca y el modelo son obligatorios.'
    })
  }

  if (!/^[A-Z0-9]{6,10}$/.test(patenteLimpia)) {
    return res.status(400).json({
      mensaje: 'Ingresá una patente válida, sin símbolos.'
    })
  }

  if (marcaLimpia.length > 50 || modeloLimpio.length > 50) {
    return res.status(400).json({
      mensaje: 'La marca y el modelo son demasiado largos.'
    })
  }

  try {
    // Comprobar si ya está registrada
    const [existentes] = await pool.execute(
      'SELECT id_vehiculo FROM vehiculos WHERE patente = ? LIMIT 1',
      [patenteLimpia]
    )

    if (existentes.length > 0) {
      return res.status(409).json({
        mensaje: 'Esta patente ya está registrada.'
      })
    }

    // Crear vehículo asociado al cliente autenticado
    const [resultado] = await pool.execute(
      `INSERT INTO vehiculos
       (id_cliente, patente, marca, modelo)
       VALUES (?, ?, ?, ?)`,
      [req.idCliente, patenteLimpia, marcaLimpia, modeloLimpio]
    )

    // Recuperar el vehículo creado
    const [vehiculos] = await pool.execute(
      `SELECT *
       FROM vehiculos
       WHERE id_vehiculo = ?
         AND id_cliente = ?`,
      [resultado.insertId, req.idCliente]
    )

    return res.status(201).json({
      mensaje: 'Vehículo registrado correctamente.',
      vehiculo: vehiculos[0]
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Esta patente ya está registrada.'
      })
    }

    console.error('Error al registrar vehículo:', error)

    return res.status(500).json({
      mensaje: 'No se pudo registrar el vehículo.'
    })
  }
})

// Editar un vehículo del cliente
router.put('/:id', verificarCliente, async (req, res) => {
  const idVehiculo = Number(req.params.id)
  const { patente, marca, modelo } = req.body || {}

  // Validar el identificador
  if (!Number.isSafeInteger(idVehiculo) || idVehiculo <= 0) {
    return res.status(400).json({
      mensaje: 'El identificador del vehículo es inválido.'
    })
  }

  // Validar los datos recibidos
  if (
    typeof patente !== 'string' ||
    typeof marca !== 'string' ||
    typeof modelo !== 'string'
  ) {
    return res.status(400).json({
      mensaje: 'Completá todos los datos del vehículo.'
    })
  }

  const patenteLimpia = patente.trim().toUpperCase().replace(/[\s-]/g, '')

  const marcaLimpia = marca.trim()
  const modeloLimpio = modelo.trim()

  if (
    !/^[A-Z0-9]{6,10}$/.test(patenteLimpia) ||
    !marcaLimpia ||
    !modeloLimpio ||
    marcaLimpia.length > 50 ||
    modeloLimpio.length > 50
  ) {
    return res.status(400).json({
      mensaje: 'Verificá los datos del vehículo.'
    })
  }

  try {
    // Comprobar que el vehículo pertenece al cliente
    const [existentes] = await pool.execute(
      `SELECT id_vehiculo
       FROM vehiculos
       WHERE id_vehiculo = ?
         AND id_cliente = ?
       LIMIT 1`,
      [idVehiculo, req.idCliente]
    )

    if (existentes.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el vehículo.'
      })
    }

    // Evitar que la patente esté registrada en otro vehículo
    const [patentes] = await pool.execute(
      `SELECT id_vehiculo
       FROM vehiculos
       WHERE patente = ?
         AND id_vehiculo <> ?
       LIMIT 1`,
      [patenteLimpia, idVehiculo]
    )

    if (patentes.length > 0) {
      return res.status(409).json({
        mensaje: 'Esta patente ya está registrada.'
      })
    }

    // Actualizar únicamente el vehículo del cliente
    await pool.execute(
      `UPDATE vehiculos
       SET patente = ?, marca = ?, modelo = ?
       WHERE id_vehiculo = ?
         AND id_cliente = ?`,
      [patenteLimpia, marcaLimpia, modeloLimpio, idVehiculo, req.idCliente]
    )

    // Recuperar los datos actualizados
    const [vehiculos] = await pool.execute(
      `SELECT *
       FROM vehiculos
       WHERE id_vehiculo = ?
         AND id_cliente = ?`,
      [idVehiculo, req.idCliente]
    )

    return res.json({
      mensaje: 'Vehículo actualizado correctamente.',
      vehiculo: vehiculos[0]
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Esta patente ya está registrada.'
      })
    }

    console.error('Error al editar vehículo:', error)

    return res.status(500).json({
      mensaje: 'No se pudo actualizar el vehículo.'
    })
  }
})

// Eliminar un vehículo del cliente
router.delete('/:id', verificarCliente, async (req, res) => {
  const idVehiculo = Number(req.params.id)

  if (!Number.isSafeInteger(idVehiculo) || idVehiculo <= 0) {
    return res.status(400).json({
      mensaje: 'El identificador del vehículo es inválido.'
    })
  }

  try {
    // Verificar que el vehículo pertenece al cliente
    const [vehiculos] = await pool.execute(
      `SELECT id_vehiculo
       FROM vehiculos
       WHERE id_vehiculo = ?
         AND id_cliente = ?
       LIMIT 1`,
      [idVehiculo, req.idCliente]
    )

    if (vehiculos.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el vehículo.'
      })
    }

    // Verificar si tiene reservas asociadas
    const [turnos] = await pool.execute(
      `SELECT id_turno
       FROM turnos
       WHERE id_vehiculo = ?
       LIMIT 1`,
      [idVehiculo]
    )

    if (turnos.length > 0) {
      return res.status(409).json({
        mensaje:
          'No podés eliminar este vehículo porque tiene reservas asociadas.'
      })
    }

    // Eliminar solamente el vehículo del cliente
    const [resultado] = await pool.execute(
      `DELETE FROM vehiculos
       WHERE id_vehiculo = ?
         AND id_cliente = ?`,
      [idVehiculo, req.idCliente]
    )

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el vehículo.'
      })
    }

    return res.json({
      mensaje: 'Vehículo eliminado correctamente.'
    })
  } catch (error) {
    // Protección adicional ante relaciones de clave foránea
    if (
      error.code === 'ER_ROW_IS_REFERENCED_2' ||
      error.code === 'ER_ROW_IS_REFERENCED'
    ) {
      return res.status(409).json({
        mensaje: 'No se puede eliminar porque tiene registros asociados.'
      })
    }

    console.error('Error al eliminar vehículo:', error)

    return res.status(500).json({
      mensaje: 'No se pudo eliminar el vehículo.'
    })
  }
})

module.exports = router
