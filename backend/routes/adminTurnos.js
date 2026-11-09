const express = require('express')
const pool = require('../db')
const { verificarAdministrador } = require('../middlewares/autenticacion')

const router = express.Router()

// Consultar todos los turnos (solo para administradores)
router.get('/', verificarAdministrador, async (req, res) => {
  try {
    const [turnos] = await pool.execute(
      `SELECT
          t.id_turno,
          c.nombre AS cliente_nombre,
          c.apellido AS cliente_apellido,
          v.patente,
          v.marca,
          v.modelo,
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
          DATE_FORMAT(
            t.fecha_hora_fin,
            '%H:%i'
          ) AS hora_fin,
          t.precio_aplicado,
          t.estado,
          t.origen
         FROM turnos t
         INNER JOIN clientes c
           ON t.id_cliente = c.id_cliente
         INNER JOIN vehiculos v
           ON t.id_vehiculo = v.id_vehiculo
         INNER JOIN servicios s
           ON t.id_servicio = s.id_servicio
         INNER JOIN puestos_lavado p
           ON t.id_puesto = p.id_puesto
         ORDER BY t.fecha_hora_inicio DESC, t.id_turno DESC`
    )

    return res.json({ turnos })
  } catch (error) {
    console.error('Error al consultar turnos:', error)

    return res.status(500).json({
      mensaje: 'No se pudieron obtener las reservas.'
    })
  }
})

// Cambiar el estado de un turno (solo para administradores)
router.patch('/:id/estado', verificarAdministrador, async (req, res) => {
  const idTurno = Number(req.params.id)
  const { estado } = req.body || {}

  if (!Number.isSafeInteger(idTurno) || idTurno <= 0) {
    return res.status(400).json({
      mensaje: 'El identificador del turno es inválido.'
    })
  }

  // Cada estado exige un estado anterior específico
  const estadosAnteriores = {
    en_proceso: 'reservado',
    finalizado: 'en_proceso',
    entregado: 'finalizado'
  }

  if (typeof estado !== 'string' || !Object.hasOwn(estadosAnteriores, estado)) {
    return res.status(400).json({
      mensaje: 'El estado solicitado no es válido.'
    })
  }

  try {
    // Consultar el estado actual del turno
    const [turnos] = await pool.execute(
      `SELECT id_turno, estado
         FROM turnos
         WHERE id_turno = ?
         LIMIT 1`,
      [idTurno]
    )

    if (turnos.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el turno.'
      })
    }

    const estadoActual = turnos[0].estado
    const estadoNecesario = estadosAnteriores[estado]

    if (estadoActual !== estadoNecesario) {
      return res.status(409).json({
        mensaje: 'No se permite pasar de ' + estadoActual + ' a ' + estado + '.'
      })
    }

    // Actualizar solamente si el estado sigue siendo el esperado
    const [resultado] = await pool.execute(
      `UPDATE turnos
         SET estado = ?
         WHERE id_turno = ?
           AND estado = ?`,
      [estado, idTurno, estadoNecesario]
    )

    if (resultado.affectedRows === 0) {
      return res.status(409).json({
        mensaje: 'El turno fue modificado. Actualizá las reservas.'
      })
    }

    return res.json({
      mensaje: 'Estado actualizado correctamente.',
      turno: {
        id_turno: idTurno,
        estado
      }
    })
  } catch (error) {
    console.error('Error al actualizar estado:', error)

    return res.status(500).json({
      mensaje: 'No se pudo actualizar el estado del turno.'
    })
  }
})

module.exports = router
