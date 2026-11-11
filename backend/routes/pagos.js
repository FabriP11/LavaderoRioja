const express = require('express')
const pool = require('../db')
const { verificarAdministrador } = require('../middlewares/autenticacion')

const router = express.Router()

// Consultar pagos registrados
router.get('/', verificarAdministrador, async (req, res) => {
  try {
    const [pagos] = await pool.execute(
      `SELECT
         p.id_pago,
         p.id_turno,
         p.monto,
         p.metodo_pago,
         DATE_FORMAT(p.fecha_pago, '%Y-%m-%d %H:%i:%s') AS fecha_pago,
         u.nombre_usuario AS registrado_por,
         c.nombre AS cliente_nombre,
         c.apellido AS cliente_apellido,
         v.patente,
         s.nombre AS servicio,
         t.estado AS estado_turno
       FROM pagos p
       INNER JOIN turnos t ON p.id_turno = t.id_turno
       INNER JOIN usuarios u ON p.registrado_por = u.id_usuario
       INNER JOIN clientes c ON t.id_cliente = c.id_cliente
       INNER JOIN vehiculos v ON t.id_vehiculo = v.id_vehiculo
       INNER JOIN servicios s ON t.id_servicio = s.id_servicio
       ORDER BY p.fecha_pago DESC, p.id_pago DESC`
    )

    return res.json({ pagos })
  } catch (error) {
    console.error('Error al consultar pagos:', error)

    return res.status(500).json({
      mensaje: 'No se pudieron obtener los pagos.'
    })
  }
})

// Registrar un pago
router.post('/', verificarAdministrador, async (req, res) => {
  const { id_turno, metodo_pago } = req.body || {}

  const idTurno = Number(id_turno)

  // Validar identificador
  if (!Number.isSafeInteger(idTurno) || idTurno <= 0) {
    return res.status(400).json({
      mensaje: 'Seleccioná un turno válido.'
    })
  }

  // Validar método de pago
  if (!['efectivo', 'transferencia'].includes(metodo_pago)) {
    return res.status(400).json({
      mensaje: 'Seleccioná un método de pago válido.'
    })
  }

  let conexion

  try {
    conexion = await pool.getConnection()
    await conexion.beginTransaction()

    // Buscar y bloquear el turno durante el registro
    const [turnos] = await conexion.execute(
      `SELECT id_turno, estado, precio_aplicado
       FROM turnos
       WHERE id_turno = ?
       FOR UPDATE`,
      [idTurno]
    )

    if (turnos.length === 0) {
      await conexion.rollback()

      return res.status(404).json({
        mensaje: 'No se encontró el turno.'
      })
    }

    const turno = turnos[0]

    // Solo registrar pagos de servicios realizados
    if (!['finalizado', 'entregado'].includes(turno.estado)) {
      await conexion.rollback()

      return res.status(409).json({
        mensaje:
          'El turno debe estar finalizado o entregado para registrar el pago.'
      })
    }

    // Obtener el importe registrado al reservar
    const monto = turno.precio_aplicado

    if (!Number.isFinite(Number(monto)) || Number(monto) <= 0) {
      await conexion.rollback()

      return res.status(400).json({
        mensaje: 'El turno no tiene un importe válido.'
      })
    }

    // Registrar el pago con el administrador autenticado
    const [resultado] = await conexion.execute(
      `INSERT INTO pagos
         (id_turno, registrado_por, monto, metodo_pago)
       VALUES (?, ?, ?, ?)`,
      [idTurno, req.admin.id_usuario, monto, metodo_pago]
    )

    await conexion.commit()

    return res.status(201).json({
      mensaje: 'Pago registrado correctamente.',
      pago: {
        id_pago: resultado.insertId,
        id_turno: idTurno,
        monto,
        metodo_pago,
        registrado_por: req.admin.id_usuario
      }
    })
  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback()
      } catch (errorRollback) {
        console.error('Error al revertir pago:', errorRollback)
      }
    }

    // La base de datos impide pagar dos veces el mismo turno
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Este turno ya tiene un pago registrado.'
      })
    }

    console.error('Error al registrar pago:', error)

    return res.status(500).json({
      mensaje: 'No se pudo registrar el pago.'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
})

module.exports = router
