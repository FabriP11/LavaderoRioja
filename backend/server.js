require('dotenv').config()

const express = require('express')
const cors = require('cors')
const pool = require('./db')
const cookieParser = require('cookie-parser')

// Importar rutas
const serviciosRoutes = require('./routes/servicios')
const vehiculosRoutes = require('./routes/vehiculos')
const authRoutes = require('./routes/auth')
const disponibilidadRoutes = require('./routes/disponibilidad')
const turnosRoutes = require('./routes/turnos')
const adminTurnosRoutes = require('./routes/adminTurnos')
const agendaRoutes = require('./routes/agenda')
const adminServiciosRoutes = require('./routes/adminServicios')
const pagosRoutes = require('./routes/pagos')

const app = express()
const PORT = process.env.PORT || 3001

// Verificar configuración del token
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('Configurá una JWT_SECRET segura en el archivo .env')
}

// Configuración de Express
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
)

app.use(express.json())
app.use(cookieParser())

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

// Conectar rutas
app.use('/api/servicios', serviciosRoutes)
app.use('/api/vehiculos', vehiculosRoutes)
app.use('/api', authRoutes)
app.use('/api/disponibilidad', disponibilidadRoutes)
app.use('/api', turnosRoutes)
app.use('/api/admin/turnos', adminTurnosRoutes)
app.use('/api/admin', agendaRoutes)
app.use('/api/admin/servicios', adminServiciosRoutes)
app.use('/api/admin/pagos', pagosRoutes)

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`)
})
