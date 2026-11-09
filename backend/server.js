require('dotenv').config()
const serviciosRoutes = require('./routes/servicios')
const {
  verificarCliente,
  verificarAdministrador
} = require('./middlewares/autenticacion')
const vehiculosRoutes = require('./routes/vehiculos')
const authRoutes = require('./routes/auth')
const disponibilidadRoutes = require('./routes/disponibilidad')
const turnosRoutes = require('./routes/turnos')
const adminTurnosRoutes = require('./routes/adminTurnos')
const agendaRoutes = require('./routes/agenda')

const express = require('express')
const cors = require('cors')
const pool = require('./db')
const cookieParser = require('cookie-parser')

const app = express()
const PORT = process.env.PORT || 3001

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('Configurá una JWT_SECRET segura en el archivo .env')
}

// Configuración
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
)

app.use(express.json())
app.use(cookieParser())

// Rutas
app.use('/api/servicios', serviciosRoutes)
app.use('/api/vehiculos', vehiculosRoutes)
app.use('/api', authRoutes)
app.use('/api/disponibilidad', disponibilidadRoutes)
app.use('/api', turnosRoutes)
app.use('/api/admin/turnos', adminTurnosRoutes)
app.use('/api/admin', agendaRoutes)

// Comprobar funcionamiento del backend
app.get('/api/estado', (req, res) => {
  res.json({
    mensaje: 'Backend de Lavadero Rioja funcionando'
  })
})

// Comprobar conexión con MySQL
app.get('/api/estado-db', async (req, res) => {
  try {
    const [resultado] = await pool.query('SELECT DATABASE() AS base_datos')

    const [tablas] = await pool.query('SHOW TABLES')

    res.json({
      mensaje: 'Conexión con MySQL exitosa',
      base_datos: resultado[0].base_datos,
      total_tablas: tablas.length
    })
  } catch (error) {
    console.error('Error de MySQL:', error.code || error.message)

    res.status(500).json({
      mensaje: 'No se pudo conectar a MySQL'
    })
  }
})

// Consultar servicios disponibles (solo para administradores)
app.get('/api/admin/servicios', verificarAdministrador, async (req, res) => {
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
app.patch(
  '/api/admin/servicios/:id',
  verificarAdministrador,
  async (req, res) => {
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
        mensaje:
          'La duración debe ser de 30 a 240 minutos, en intervalos de 30.'
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
        [
          Number(precioTexto).toFixed(2),
          duracion,
          activoNormalizado,
          idServicio
        ]
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
  }
)

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`)
})
