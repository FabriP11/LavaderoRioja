const express = require('express')
const pool = require('../db')
const { verificarCliente } = require('../middlewares/autenticacion')

const router = express.Router()

// Registrar un turno para el cliente
router.post('/turnos', verificarCliente, async (req, res) => {
  const { id_vehiculo, id_servicio, fecha, hora_inicio } = req.body || {}

  const idVehiculo = Number(id_vehiculo)
  const idServicio = Number(id_servicio)

  // Validar identificadores
  if (
    !Number.isSafeInteger(idVehiculo) ||
    idVehiculo <= 0 ||
    !Number.isSafeInteger(idServicio) ||
    idServicio <= 0
  ) {
    return res.status(400).json({
      mensaje: 'Seleccioná un vehículo y un servicio válidos.'
    })
  }

  // Validar fecha real
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

  // Horarios en intervalos de 30 minutos
  if (
    typeof hora_inicio !== 'string' ||
    !/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(hora_inicio)
  ) {
    return res.status(400).json({
      mensaje: 'Seleccioná un horario válido.'
    })
  }

  const horaAMinutos = hora => {
    const [h, m] = hora.split(':').map(Number)
    return h * 60 + m
  }

  const minutosAHora = minutos => {
    const h = Math.floor(minutos / 60)
    const m = minutos % 60

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // Fecha y hora actuales de La Rioja
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Argentina/La_Rioja',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(new Date())
      .map(parte => [parte.type, parte.value])
  )

  const ahora = `${partes.year}-${partes.month}-${partes.day} ${partes.hour}:${partes.minute}:00`
  const inicio = `${fecha} ${hora_inicio}:00`

  if (inicio <= ahora) {
    return res.status(400).json({
      mensaje: 'No podés reservar un horario que ya pasó.'
    })
  }

  // Errores controlados de reserva
  const errorReserva = (estado, mensaje) => {
    const error = new Error(mensaje)
    error.estadoHttp = estado
    throw error
  }

  let conexion

  try {
    conexion = await pool.getConnection()

    // Cada lectura tendrá los últimos datos confirmados
    await conexion.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED')

    await conexion.beginTransaction()

    // 1. Bloquear los puestos durante la reserva
    const [puestos] = await conexion.execute(
      `SELECT id_puesto
       FROM puestos_lavado
       WHERE activo = 1
       ORDER BY id_puesto
       FOR UPDATE`
    )

    if (puestos.length === 0) {
      errorReserva(409, 'No hay puestos de lavado activos.')
    }

    // 2. Verificar que el vehículo pertenece al cliente
    const [vehiculos] = await conexion.execute(
      `SELECT id_vehiculo
       FROM vehiculos
       WHERE id_vehiculo = ?
         AND id_cliente = ?
       LIMIT 1`,
      [idVehiculo, req.idCliente]
    )

    if (vehiculos.length === 0) {
      errorReserva(404, 'No se encontró tu vehículo.')
    }

    // 3. Obtener duración y precio actuales
    const [servicios] = await conexion.execute(
      `SELECT id_servicio, nombre, precio, duracion_minutos
       FROM servicios
       WHERE id_servicio = ?
         AND activo = 1
       LIMIT 1`,
      [idServicio]
    )

    if (servicios.length === 0) {
      errorReserva(404, 'El servicio no está disponible.')
    }

    const servicio = servicios[0]

    if (
      !Number.isSafeInteger(servicio.duracion_minutos) ||
      servicio.duracion_minutos <= 0
    ) {
      errorReserva(500, 'La duración del servicio es inválida.')
    }

    const minutoInicio = horaAMinutos(hora_inicio)
    const minutoFin = minutoInicio + servicio.duracion_minutos

    const horaFin = minutosAHora(minutoFin)
    const fin = `${fecha} ${horaFin}:00`

    // 4. Comprobar horarios de atención
    const diaSemana = fechaObjeto.getUTCDay()
    const diaBaseDatos = diaSemana === 0 ? 7 : diaSemana

    const [horarios] = await conexion.execute(
      `SELECT
         TIME_FORMAT(hora_inicio, '%H:%i') AS inicio,
         TIME_FORMAT(hora_fin, '%H:%i') AS fin
       FROM horarios_atencion
       WHERE dia_semana = ?
         AND activo = 1`,
      [diaBaseDatos]
    )

    const dentroDelHorario = horarios.some(horario => {
      return (
        minutoInicio >= horaAMinutos(horario.inicio) &&
        minutoFin <= horaAMinutos(horario.fin)
      )
    })

    if (!dentroDelHorario) {
      errorReserva(409, 'El servicio no entra dentro del horario de atención.')
    }

    // 5. Buscar reservas superpuestas
    const [turnos] = await conexion.execute(
      `SELECT id_puesto, id_vehiculo
       FROM turnos
       WHERE estado <> 'cancelado'
         AND fecha_hora_inicio < ?
         AND fecha_hora_fin > ?`,
      [fin, inicio]
    )

    // Un vehículo no puede tener dos turnos simultáneos
    const vehiculoOcupado = turnos.some(
      turno => Number(turno.id_vehiculo) === idVehiculo
    )

    if (vehiculoOcupado) {
      errorReserva(409, 'Este vehículo ya tiene un turno en ese horario.')
    }

    // 6. Buscar bloqueos superpuestos
    const [bloqueos] = await conexion.execute(
      `SELECT id_puesto
       FROM bloqueos_agenda
       WHERE fecha_hora_inicio < ?
         AND fecha_hora_fin > ?`,
      [fin, inicio]
    )

    // 7. Elegir el primer puesto disponible
    const puestoLibre = puestos.find(puesto => {
      const ocupado = turnos.some(
        turno => Number(turno.id_puesto) === Number(puesto.id_puesto)
      )

      const bloqueado = bloqueos.some(
        bloqueo =>
          bloqueo.id_puesto === null ||
          Number(bloqueo.id_puesto) === Number(puesto.id_puesto)
      )

      return !ocupado && !bloqueado
    })

    if (!puestoLibre) {
      errorReserva(409, 'Ya no quedan puestos disponibles para ese horario.')
    }

    // 8. Crear reserva confirmada
    const [resultado] = await conexion.execute(
      `INSERT INTO turnos (
         id_cliente,
         id_vehiculo,
         id_servicio,
         id_puesto,
         fecha_hora_inicio,
         fecha_hora_fin,
         precio_aplicado,
         origen,
         estado
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, 'web', 'reservado')`,
      [
        req.idCliente,
        idVehiculo,
        idServicio,
        puestoLibre.id_puesto,
        inicio,
        fin,
        servicio.precio
      ]
    )

    // 9. Confirmar la transacción
    await conexion.commit()

    return res.status(201).json({
      mensaje: '¡Turno reservado correctamente!',
      turno: {
        id_turno: resultado.insertId,
        id_vehiculo: idVehiculo,
        id_servicio: idServicio,
        servicio: servicio.nombre,
        id_puesto: puestoLibre.id_puesto,
        fecha,
        hora_inicio,
        hora_fin: horaFin,
        precio_aplicado: servicio.precio,
        estado: 'reservado'
      }
    })
  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback()
      } catch (errorRollback) {
        console.error('Error al revertir reserva:', errorRollback)
      }
    }

    if (error.estadoHttp) {
      return res.status(error.estadoHttp).json({
        mensaje: error.message
      })
    }

    console.error('Error al crear turno:', error)

    return res.status(500).json({
      mensaje: 'No se pudo crear la reserva.'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
})

// Consultar turnos del cliente
router.get('/mis-turnos', verificarCliente, async (req, res) => {
  try {
    const [turnos] = await pool.execute(
      `SELECT
        t.id_turno,
        t.id_vehiculo,
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
       INNER JOIN vehiculos v
         ON t.id_vehiculo = v.id_vehiculo
       INNER JOIN servicios s
         ON t.id_servicio = s.id_servicio
       INNER JOIN puestos_lavado p
         ON t.id_puesto = p.id_puesto
       WHERE t.id_cliente = ?
       ORDER BY t.fecha_hora_inicio DESC, t.id_turno DESC`,
      [req.idCliente]
    )

    return res.json({ turnos })
  } catch (error) {
    console.error('Error al consultar mis turnos:', error)

    return res.status(500).json({
      mensaje: 'No se pudieron obtener tus turnos.'
    })
  }
})

// Cancelar un turno del cliente
router.patch('/mis-turnos/:id/cancelar', verificarCliente, async (req, res) => {
  const idTurno = Number(req.params.id)

  if (!Number.isSafeInteger(idTurno) || idTurno <= 0) {
    return res.status(400).json({
      mensaje: 'El identificador del turno es inválido.'
    })
  }

  // Fecha y hora actual de La Rioja
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

  try {
    // Cancelación protegida en una única operación
    const [resultado] = await pool.execute(
      `UPDATE turnos
         SET estado = 'cancelado',
             fecha_cancelacion = ?
         WHERE id_turno = ?
           AND id_cliente = ?
           AND estado = 'reservado'
           AND fecha_hora_inicio > ?`,
      [ahora, idTurno, req.idCliente, ahora]
    )

    if (resultado.affectedRows === 0) {
      const [turnos] = await pool.execute(
        `SELECT estado
           FROM turnos
           WHERE id_turno = ?
             AND id_cliente = ?
           LIMIT 1`,
        [idTurno, req.idCliente]
      )

      if (turnos.length === 0) {
        return res.status(404).json({
          mensaje: 'No se encontró el turno.'
        })
      }

      return res.status(409).json({
        mensaje:
          turnos[0].estado !== 'reservado'
            ? 'Solo podés cancelar turnos en estado reservado.'
            : 'No podés cancelar un turno que ya comenzó.'
      })
    }

    return res.json({
      mensaje: 'Turno cancelado correctamente.',
      id_turno: idTurno,
      estado: 'cancelado'
    })
  } catch (error) {
    console.error('Error al cancelar turno:', error)

    return res.status(500).json({
      mensaje: 'No se pudo cancelar el turno.'
    })
  }
})

module.exports = router
