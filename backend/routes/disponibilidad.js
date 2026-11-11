const express = require('express')
const pool = require('../db')
const {
  horaAMinutos,
  minutosAHora,
  obtenerPartesFechaHora
} = require('../utils/fechaHora')

const router = express.Router()

// Consultar disponibilidad de horarios para un servicio en una fecha
router.get('/', async (req, res) => {
  const fecha = req.query.fecha
  const idServicio = Number(req.query.id_servicio)

  // Validar la fecha
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

  if (!Number.isSafeInteger(idServicio) || idServicio <= 0) {
    return res.status(400).json({
      mensaje: 'Seleccioná un servicio válido.'
    })
  }

  // Obtener fecha y hora actuales de Argentina
  const partes = obtenerPartesFechaHora()

  const hoy = `${partes.year}-${partes.month}-${partes.day}`
  const ahora = `${hoy} ${partes.hour}:${partes.minute}:00`

  if (fecha < hoy) {
    return res.status(400).json({
      mensaje: 'No podés consultar fechas anteriores a hoy.'
    })
  }

  try {
    // 1. Obtener el servicio
    const [servicios] = await pool.execute(
      `SELECT id_servicio, nombre, duracion_minutos
       FROM servicios
       WHERE id_servicio = ? AND activo = 1
       LIMIT 1`,
      [idServicio]
    )

    if (servicios.length === 0) {
      return res.status(404).json({
        mensaje: 'El servicio no está disponible.'
      })
    }

    const servicio = servicios[0]
    const duracion = servicio.duracion_minutos

    // 2. Obtener los puestos activos
    const [puestos] = await pool.execute(
      `SELECT id_puesto
       FROM puestos_lavado
       WHERE activo = 1
       ORDER BY id_puesto`
    )

    // 3. Obtener los horarios del día solicitado
    // WEEKDAY: lunes = 0, domingo = 6
    const [horarios] = await pool.execute(
      `SELECT
         TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
         TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin
       FROM horarios_atencion
       WHERE dia_semana = WEEKDAY(?) + 1
         AND activo = 1
       ORDER BY hora_inicio`,
      [fecha]
    )

    // 4. Obtener reservas que se cruzan con ese día
    const [turnos] = await pool.execute(
      `SELECT
         id_puesto,
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
         AND fecha_hora_inicio < DATE_ADD(?, INTERVAL 1 DAY)
         AND fecha_hora_fin > ?`,
      [fecha, fecha]
    )

    // 5. Obtener bloqueos del día
    const [bloqueos] = await pool.execute(
      `SELECT
         id_puesto,
         DATE_FORMAT(
           fecha_hora_inicio,
           '%Y-%m-%d %H:%i:%s'
         ) AS inicio,
         DATE_FORMAT(
           fecha_hora_fin,
           '%Y-%m-%d %H:%i:%s'
         ) AS fin
       FROM bloqueos_agenda
       WHERE fecha_hora_inicio < DATE_ADD(?, INTERVAL 1 DAY)
         AND fecha_hora_fin > ?`,
      [fecha, fecha]
    )

    const horariosDisponibles = []

    // 6. Generar horarios cada 30 minutos
    for (const horario of horarios) {
      const inicioFranja = horaAMinutos(horario.hora_inicio)
      const finFranja = horaAMinutos(horario.hora_fin)

      for (
        let minuto = inicioFranja;
        minuto + duracion <= finFranja;
        minuto += 30
      ) {
        const horaInicio = minutosAHora(minuto)
        const horaFin = minutosAHora(minuto + duracion)

        const inicio = `${fecha} ${horaInicio}:00`
        const fin = `${fecha} ${horaFin}:00`

        // No ofrecer horarios que ya pasaron
        if (inicio <= ahora) {
          continue
        }

        // 7. Buscar puestos que estén libres
        const puestosLibres = puestos.filter(puesto => {
          const tieneTurno = turnos.some(
            turno =>
              Number(turno.id_puesto) === puesto.id_puesto &&
              inicio < turno.fin &&
              fin > turno.inicio
          )

          const tieneBloqueo = bloqueos.some(
            bloqueo =>
              (bloqueo.id_puesto === null ||
                Number(bloqueo.id_puesto) === puesto.id_puesto) &&
              inicio < bloqueo.fin &&
              fin > bloqueo.inicio
          )

          return !tieneTurno && !tieneBloqueo
        })

        horariosDisponibles.push({
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          puestos_disponibles: puestosLibres.length,
          disponible: puestosLibres.length > 0
        })
      }
    }

    return res.json({
      fecha,
      servicio: {
        id_servicio: servicio.id_servicio,
        nombre: servicio.nombre,
        duracion_minutos: duracion
      },
      horarios: horariosDisponibles
    })
  } catch (error) {
    console.error('Error al consultar disponibilidad:', error)

    return res.status(500).json({
      mensaje: 'No se pudieron consultar los horarios.'
    })
  }
})

module.exports = router
