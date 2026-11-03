const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Configuración
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
)

app.use(express.json())

// Ruta de prueba
app.get('/api/estado', (req, res) => {
  res.json({
    mensaje: 'Backend de Lavadero Rioja funcionando correctamente'
  })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`)
})
