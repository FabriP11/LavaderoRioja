const express = require('express')
const pool = require('../db')
const { verificarAdministrador } = require('../middlewares/autenticacion')
const { obtenerPartesFechaHora } = require('../utils/fechaHora')

const router = express.Router()

// Validar horas con formato HH:MM
function horaValida (hora) {
  return typeof hora === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora)
}

// Convertir el estado a 1 o 0
function obtenerActivo (valor) {
  if (valor === true || valor === 1 || valor === '1') return 1
  if (valor === false || valor === 0 || valor === '0') return 0
  return null
}

function errorControlado (estado, mensaje) {
  const error = new Error(mensaje)
  error.estadoHttp = estado
  throw error
}

// Consultar horarios, incluidos los inactivos
router.get('/', verificarAdministrador, async (req, res) => {
  try {
    const [horarios] = await pool.execute(
      `SELECT
         id_horario,
         dia_semana,
         TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
         TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin,
         activo
       FROM horarios_atencion
       ORDER BY dia_semana, hora_inicio`
    )

    return res.json({ horarios })
  } catch (error) {
    console.error('Error al consultar horarios:', error)

    return res.status(500).json({
      mensaje: 'No se pudieron obtener los horarios.'
    })
  }
})

// Crear o modificar una franja horaria
async function guardarHorario (req, res, nuevo) {
  const { hora_inicio, hora_fin } = req.body || {}

  const activo = obtenerActivo(req.body?.activo ?? (nuevo ? 1 : undefined))

  const dia = nuevo ? Number(req.body?.dia_semana) : null
  const id = nuevo ? null : Number(req.params.id)

  if (nuevo && (!Number.isSafeInteger(dia) || dia < 1 || dia > 7)) {
    return res.status(400).json({
      mensaje: 'Seleccioná un día válido (1 a 7).'
    })
  }

  if (!nuevo && (!Number.isSafeInteger(id) || id <= 0)) {
    return res.status(400).json({
      mensaje: 'El horario seleccionado es inválido.'
    })
  }

  if (
    !horaValida(hora_inicio) ||
    !horaValida(hora_fin) ||
    hora_inicio >= hora_fin
  ) {
    return res.status(400).json({
      mensaje: 'La apertura debe ser anterior al cierre.'
    })
  }

  if (activo === null) {
    return res.status(400).json({
      mensaje: 'El estado del horario es inválido.'
    })
  }

  let conexion

  try {
    conexion = await pool.getConnection()

    await conexion.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED')

    await conexion.beginTransaction()

    // Coordinar los cambios con la creación de reservas
    await conexion.execute(
      `SELECT id_puesto
       FROM puestos_lavado
       ORDER BY id_puesto
       FOR UPDATE`
    )

    let diaAfectado = dia
    let idHorario = id

    if (nuevo) {
      // Crear una nueva franja
      const [resultado] = await conexion.execute(
        `INSERT INTO horarios_atencion
         (dia_semana, hora_inicio, hora_fin, activo)
         VALUES (?, ?, ?, ?)`,
        [dia, hora_inicio, hora_fin, activo]
      )

      idHorario = resultado.insertId
    } else {
      // Verificar el horario existente
      const [existentes] = await conexion.execute(
        `SELECT dia_semana
         FROM horarios_atencion
         WHERE id_horario = ?
         FOR UPDATE`,
        [id]
      )

      if (existentes.length === 0) {
        errorControlado(404, 'No se encontró el horario.')
      }

      diaAfectado = existentes[0].dia_semana

      // Actualizar la franja
      await conexion.execute(
        `UPDATE horarios_atencion
         SET hora_inicio = ?,
             hora_fin = ?,
             activo = ?
         WHERE id_horario = ?`,
        [hora_inicio, hora_fin, activo, id]
      )
    }

    // Obtener las franjas activas del día afectado
    const [franjas] = await conexion.execute(
      `SELECT
         TIME_FORMAT(hora_inicio, '%H:%i') AS inicio,
         TIME_FORMAT(hora_fin, '%H:%i') AS fin
       FROM horarios_atencion
       WHERE dia_semana = ?
         AND activo = 1
       ORDER BY hora_inicio`,
      [diaAfectado]
    )

    // Evitar franjas activas superpuestas
    for (let i = 1; i < franjas.length; i++) {
      if (franjas[i].inicio < franjas[i - 1].fin) {
        errorControlado(409, 'Las franjas activas no pueden superponerse.')
      }
    }

    if (!nuevo) {
      // Obtener la fecha actual de La Rioja
      const partes = obtenerPartesFechaHora()

      const ahora =
        `${partes.year}-${partes.month}-${partes.day} ` +
        `${partes.hour}:${partes.minute}:${partes.second}`

      // Consultar reservas futuras del día de la semana
      const [turnos] = await conexion.execute(
        `SELECT
           id_turno,
           DATE_FORMAT(
             fecha_hora_inicio,
             '%Y-%m-%d %H:%i:%s'
           ) AS inicio,
           DATE_FORMAT(
             fecha_hora_fin,
             '%Y-%m-%d %H:%i:%s'
           ) AS fin
         FROM turnos
         WHERE estado <> 'cancelado'
           AND fecha_hora_inicio >= ?
           AND WEEKDAY(fecha_hora_inicio) + 1 = ?`,
        [ahora, diaAfectado]
      )

      // Comprobar que las reservas siguen dentro de una franja
      for (const turno of turnos) {
        const fechaTurno = turno.inicio.slice(0, 10)

        const cubierto = franjas.some(
          franja =>
            turno.inicio >= `${fechaTurno} ${franja.inicio}:00` &&
            turno.fin <= `${fechaTurno} ${franja.fin}:00`
        )

        if (!cubierto) {
          errorControlado(
            409,
            `No se puede cambiar el horario: la reserva #${turno.id_turno} quedaría fuera de atención.`
          )
        }
      }
    }

    await conexion.commit()

    return res.status(nuevo ? 201 : 200).json({
      mensaje: nuevo
        ? 'Horario agregado correctamente.'
        : 'Horario actualizado correctamente.',
      horario: {
        id_horario: idHorario,
        dia_semana: diaAfectado,
        hora_inicio,
        hora_fin,
        activo
      }
    })
  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback()
      } catch (errorRollback) {
        console.error('Error al revertir horario:', errorRollback)
      }
    }

    if (error.estadoHttp) {
      return res.status(error.estadoHttp).json({
        mensaje: error.message
      })
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Ya existe esa franja horaria para ese día.'
      })
    }

    console.error('Error al guardar horario:', error)

    return res.status(500).json({
      mensaje: 'No se pudo guardar el horario.'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
}

// Agregar horario
router.post('/', verificarAdministrador, (req, res) =>
  guardarHorario(req, res, true)
)

// Modificar horario
router.patch('/:id', verificarAdministrador, (req, res) =>
  guardarHorario(req, res, false)
)

module.exports = router
