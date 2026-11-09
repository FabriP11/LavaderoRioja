const express = require('express')
const pool = require('../db')
const { verificarAdministrador } = require('../middlewares/autenticacion')

const router = express.Router()

// Consultar servicios disponibles (solo para administradores)
router.get('/', verificarAdministrador, async (req, res) => {
  try {
    const [servicios] = await pool.execute(
      `SELECT
           id_servicio,
           nombre,
           descripcion,
           precio,
           duracion_minutos,
           activo
         FROM servicios
         ORDER BY id_servicio`
    )

    return res.json({ servicios })
  } catch (error) {
    console.error('Error al consultar servicios:', error)

    return res.status(500).json({
      mensaje: 'No se pudieron obtener los servicios.'
    })
  }
})

// Actualizar un servicio (solo para administradores)
router.patch('/:id', verificarAdministrador, async (req, res) => {
  const idServicio = Number(req.params.id)

  const { precio, duracion_minutos, activo } = req.body || {}

  // Validar identificador
  if (!Number.isSafeInteger(idServicio) || idServicio <= 0) {
    return res.status(400).json({
      mensaje: 'El identificador del servicio es inválido.'
    })
  }

  // Validar precio (hasta dos decimales)
  const precioTexto = String(precio ?? '').trim()

  const precioValido =
    /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(precioTexto) &&
    Number(precioTexto) > 0

  if (!precioValido) {
    return res.status(400).json({
      mensaje: 'Ingresá un precio válido mayor que cero.'
    })
  }

  // Validar duración
  const duracion = Number(duracion_minutos)

  if (
    !Number.isSafeInteger(duracion) ||
    duracion < 30 ||
    duracion > 240 ||
    duracion % 30 !== 0
  ) {
    return res.status(400).json({
      mensaje: 'La duración debe ser de 30 a 240 minutos, en intervalos de 30.'
    })
  }

  // Validar estado activo/inactivo
  let activoNormalizado

  if (activo === true || activo === 1 || activo === '1') {
    activoNormalizado = 1
  } else if (activo === false || activo === 0 || activo === '0') {
    activoNormalizado = 0
  } else {
    return res.status(400).json({
      mensaje: 'El estado del servicio es inválido.'
    })
  }

  try {
    // Verificar que el servicio existe
    const [existentes] = await pool.execute(
      `SELECT id_servicio
         FROM servicios
         WHERE id_servicio = ?
         LIMIT 1`,
      [idServicio]
    )

    if (existentes.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el servicio.'
      })
    }

    // Actualizar el servicio
    await pool.execute(
      `UPDATE servicios
         SET precio = ?,
             duracion_minutos = ?,
             activo = ?
         WHERE id_servicio = ?`,
      [Number(precioTexto).toFixed(2), duracion, activoNormalizado, idServicio]
    )

    // Consultar los datos actualizados
    const [servicios] = await pool.execute(
      `SELECT
           id_servicio,
           nombre,
           descripcion,
           precio,
           duracion_minutos,
           activo
         FROM servicios
         WHERE id_servicio = ?`,
      [idServicio]
    )

    return res.json({
      mensaje: 'Servicio actualizado correctamente.',
      servicio: servicios[0]
    })
  } catch (error) {
    console.error('Error al actualizar servicio:', error)

    return res.status(500).json({
      mensaje: 'No se pudo actualizar el servicio.'
    })
  }
})

module.exports = router
