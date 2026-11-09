const express = require('express')
const pool = require('../db')
const { verificarAdministrador } = require('../middlewares/autenticacion')

const router = express.Router()

// Consultar agenda completa de un día (solo para administradores)
router.get('/agenda', verificarAdministrador, async (req, res) => {
  const { fecha } = req.query

  // Validar la fecha solicitada
  const fechaObjeto =
    typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
      ? new Date(`${fecha}T00:00:00Z`)
      : null

  if (
    !fechaObjeto ||
    Number.isNaN(fechaObjeto.getTime()) ||
    fechaObjeto.toISOString().slice(0, 10) !== fecha
  ) {
    return res.status(400).json({
      mensaje: 'Ingresá una fecha válida (AAAA-MM-DD).'
    })
  }

  try {
    // 1. Obtener los puestos del lavadero
    const [puestos] = await pool.execute(
      `SELECT id_puesto, nombre, activo
         FROM puestos_lavado
         ORDER BY id_puesto`
    )

    // 2. Obtener las reservas del día
    const [turnos] = await pool.execute(
      `SELECT
           t.id_turno,
           t.id_puesto,
           c.nombre AS cliente_nombre,
           c.apellido AS cliente_apellido,
           v.patente,
           v.marca,
           v.modelo,
           s.nombre AS servicio,
           DATE_FORMAT(
             t.fecha_hora_inicio,
             '%Y-%m-%d %H:%i:%s'
           ) AS inicio,
           DATE_FORMAT(
             t.fecha_hora_fin,
             '%Y-%m-%d %H:%i:%s'
           ) AS fin,
           t.estado
         FROM turnos t
         INNER JOIN clientes c
           ON t.id_cliente = c.id_cliente
         INNER JOIN vehiculos v
           ON t.id_vehiculo = v.id_vehiculo
         INNER JOIN servicios s
           ON t.id_servicio = s.id_servicio
         WHERE t.fecha_hora_inicio <
                 DATE_ADD(?, INTERVAL 1 DAY)
           AND t.fecha_hora_fin > ?
         ORDER BY t.fecha_hora_inicio`,
      [fecha, fecha]
    )

    // 3. Obtener los bloqueos de agenda
    const [bloqueos] = await pool.execute(
      `SELECT
           id_bloqueo,
           id_puesto,
           DATE_FORMAT(
             fecha_hora_inicio,
             '%Y-%m-%d %H:%i:%s'
           ) AS inicio,
           DATE_FORMAT(
             fecha_hora_fin,
             '%Y-%m-%d %H:%i:%s'
           ) AS fin,
           motivo
         FROM bloqueos_agenda
         WHERE fecha_hora_inicio <
                 DATE_ADD(?, INTERVAL 1 DAY)
           AND fecha_hora_fin > ?
         ORDER BY fecha_hora_inicio`,
      [fecha, fecha]
    )

    // 4. Organizar la información por puesto
    const agenda = puestos.map(puesto => ({
      ...puesto,

      turnos: turnos.filter(
        turno => Number(turno.id_puesto) === Number(puesto.id_puesto)
      ),

      bloqueos: bloqueos.filter(
        bloqueo =>
          bloqueo.id_puesto === null ||
          Number(bloqueo.id_puesto) === Number(puesto.id_puesto)
      )
    }))

    return res.json({
      fecha,
      puestos: agenda
    })
  } catch (error) {
    console.error('Error al consultar agenda:', error)

    return res.status(500).json({
      mensaje: 'No se pudo consultar la agenda.'
    })
  }
})

// Registrar un bloqueo de agenda (solo para administradores)
router.post('/bloqueos', verificarAdministrador, async (req, res) => {
  const { id_puesto, fecha, hora_inicio, hora_fin, motivo } = req.body || {}

  // NULL significa cierre general de ambos puestos
  const idPuesto = id_puesto === null ? null : Number(id_puesto)

  if (
    id_puesto === undefined ||
    (idPuesto !== null && (!Number.isSafeInteger(idPuesto) || idPuesto <= 0))
  ) {
    return res.status(400).json({
      mensaje: 'Seleccioná un puesto válido.'
    })
  }

  const fechaObjeto =
    typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
      ? new Date(`${fecha}T00:00:00Z`)
      : null

  if (
    !fechaObjeto ||
    Number.isNaN(fechaObjeto.getTime()) ||
    fechaObjeto.toISOString().slice(0, 10) !== fecha
  ) {
    return res.status(400).json({
      mensaje: 'Ingresá una fecha válida.'
    })
  }

  const formatoHora = /^(?:[01]\d|2[0-3]):[0-5]\d$/

  if (
    typeof hora_inicio !== 'string' ||
    typeof hora_fin !== 'string' ||
    !formatoHora.test(hora_inicio) ||
    !formatoHora.test(hora_fin) ||
    hora_fin <= hora_inicio
  ) {
    return res.status(400).json({
      mensaje: 'Ingresá un intervalo horario válido.'
    })
  }

  if (
    typeof motivo !== 'string' ||
    !motivo.trim() ||
    motivo.trim().length > 150
  ) {
    return res.status(400).json({
      mensaje: 'Ingresá un motivo de hasta 150 caracteres.'
    })
  }

  const inicio = `${fecha} ${hora_inicio}:00`
  const fin = `${fecha} ${hora_fin}:00`

  // Obtener la fecha y hora actual de La Rioja
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Argentina/La_Rioja',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(new Date())
      .map(parte => [parte.type, parte.value])
  )

  const ahora =
    `${partes.year}-${partes.month}-${partes.day} ` +
    `${partes.hour}:${partes.minute}:${partes.second}`

  if (inicio <= ahora) {
    return res.status(400).json({
      mensaje: 'No podés bloquear un horario que ya pasó.'
    })
  }

  const rechazar = (codigo, mensaje) => {
    const error = new Error(mensaje)
    error.estadoHttp = codigo
    throw error
  }

  let conexion

  try {
    conexion = await pool.getConnection()

    await conexion.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED')

    await conexion.beginTransaction()

    // Bloquear los mismos puestos que utiliza
    // el endpoint de creación de reservas
    const [puestos] = await conexion.execute(
      `SELECT id_puesto
         FROM puestos_lavado
         WHERE activo = 1
         ORDER BY id_puesto
         FOR UPDATE`
    )

    if (puestos.length === 0) {
      rechazar(409, 'No hay puestos activos.')
    }

    if (
      idPuesto !== null &&
      !puestos.some(puesto => Number(puesto.id_puesto) === idPuesto)
    ) {
      rechazar(404, 'El puesto no existe o está deshabilitado.')
    }

    // Comprobar reservas superpuestas
    const [turnos] = await conexion.execute(
      `SELECT id_turno
         FROM turnos
         WHERE estado <> 'cancelado'
           AND fecha_hora_inicio < ?
           AND fecha_hora_fin > ?
           AND (? IS NULL OR id_puesto = ?)
         LIMIT 1`,
      [fin, inicio, idPuesto, idPuesto]
    )

    if (turnos.length > 0) {
      rechazar(409, 'No se puede bloquear: existen reservas en ese horario.')
    }

    // Comprobar bloqueos anteriores
    const [bloqueos] = await conexion.execute(
      `SELECT id_bloqueo
         FROM bloqueos_agenda
         WHERE fecha_hora_inicio < ?
           AND fecha_hora_fin > ?
           AND (
             ? IS NULL
             OR id_puesto IS NULL
             OR id_puesto = ?
           )
         LIMIT 1`,
      [fin, inicio, idPuesto, idPuesto]
    )

    if (bloqueos.length > 0) {
      rechazar(409, 'Ya existe un bloqueo que se superpone con ese horario.')
    }

    // Registrar el bloqueo
    const [resultado] = await conexion.execute(
      `INSERT INTO bloqueos_agenda (
           id_puesto,
           fecha_hora_inicio,
           fecha_hora_fin,
           motivo
         )
         VALUES (?, ?, ?, ?)`,
      [idPuesto, inicio, fin, motivo.trim()]
    )

    await conexion.commit()

    return res.status(201).json({
      mensaje: 'Horario bloqueado correctamente.',
      bloqueo: {
        id_bloqueo: resultado.insertId,
        id_puesto: idPuesto,
        inicio,
        fin,
        motivo: motivo.trim()
      }
    })
  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback()
      } catch (errorRollback) {
        console.error('Error al revertir bloqueo:', errorRollback)
      }
    }

    if (error.estadoHttp) {
      return res.status(error.estadoHttp).json({
        mensaje: error.message
      })
    }

    console.error('Error al crear bloqueo:', error)

    return res.status(500).json({
      mensaje: 'No se pudo registrar el bloqueo.'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
})

// Eliminar un bloqueo de agenda (solo para administradores)
router.delete('/bloqueos/:id', verificarAdministrador, async (req, res) => {
  const idBloqueo = Number(req.params.id)

  if (!Number.isSafeInteger(idBloqueo) || idBloqueo <= 0) {
    return res.status(400).json({
      mensaje: 'El identificador del bloqueo es inválido.'
    })
  }

  try {
    // Buscar el bloqueo
    const [bloqueos] = await pool.execute(
      `SELECT id_bloqueo, id_puesto, motivo
         FROM bloqueos_agenda
         WHERE id_bloqueo = ?
         LIMIT 1`,
      [idBloqueo]
    )

    if (bloqueos.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el bloqueo.'
      })
    }

    // Eliminar el bloqueo de MySQL
    const [resultado] = await pool.execute(
      `DELETE FROM bloqueos_agenda
         WHERE id_bloqueo = ?`,
      [idBloqueo]
    )

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'El bloqueo ya no existe.'
      })
    }

    return res.json({
      mensaje: 'Bloqueo eliminado correctamente.',
      id_bloqueo: idBloqueo
    })
  } catch (error) {
    console.error('Error al eliminar bloqueo:', error)

    return res.status(500).json({
      mensaje: 'No se pudo eliminar el bloqueo.'
    })
  }
})

module.exports = router
