const express = require('express')
const pool = require('../db')

const router = express.Router()

// Obtener servicios activos
router.get('/', async (req, res) => {
  try {
    const [servicios] = await pool.query(`
      SELECT
        id_servicio,
        nombre,
        descripcion,
        precio,
        duracion_minutos
      FROM servicios
      WHERE activo = TRUE
      ORDER BY duracion_minutos ASC
    `)

    res.json(servicios)
  } catch (error) {
    console.error('Error al obtener servicios:', error)

    res.status(500).json({
      mensaje: 'No se pudieron cargar los servicios'
    })
  }
})

module.exports = router
