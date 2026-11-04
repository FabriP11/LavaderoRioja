require('dotenv').config()

const express = require('express')
const cors = require('cors')
const pool = require('./db')
const bcrypt = require('bcryptjs')

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

// Obtener servicios activos
app.get('/api/servicios', async (req, res) => {
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

// Registro de usuario
app.post('/api/registro', async (req, res) => {
  const { nombre, apellido, nombre_usuario, correo, telefono, contrasena } =
    req.body || {}

  // Validar datos obligatorios
  if (
    typeof nombre !== 'string' ||
    typeof apellido !== 'string' ||
    typeof nombre_usuario !== 'string' ||
    typeof correo !== 'string' ||
    typeof contrasena !== 'string' ||
    (telefono != null && typeof telefono !== 'string')
  ) {
    return res.status(400).json({
      mensaje: 'Los datos del formulario son inválidos.'
    })
  }

  // Limpiar los datos recibidos
  const nombreLimpio = nombre.trim()
  const apellidoLimpio = apellido.trim()
  const usuarioLimpio = nombre_usuario.trim()
  const correoLimpio = correo.trim().toLowerCase()
  const telefonoLimpio = (telefono || '').trim()

  // Validar nombre y apellido
  if (
    !nombreLimpio ||
    !apellidoLimpio ||
    nombreLimpio.length > 100 ||
    apellidoLimpio.length > 100
  ) {
    return res.status(400).json({
      mensaje: 'Ingresá un nombre y apellido válidos.'
    })
  }

  // Validar nombre de usuario
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(usuarioLimpio)) {
    return res.status(400).json({
      mensaje: 'El usuario debe tener entre 3 y 30 caracteres.'
    })
  }

  // Validar correo electrónico
  if (
    correoLimpio.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)
  ) {
    return res.status(400).json({
      mensaje: 'Ingresá un correo electrónico válido.'
    })
  }

  // Validar teléfono
  if (telefonoLimpio.length > 30) {
    return res.status(400).json({
      mensaje: 'El teléfono es demasiado largo.'
    })
  }

  // Validar contraseña
  if (contrasena.length < 8 || Buffer.byteLength(contrasena, 'utf8') > 72) {
    return res.status(400).json({
      mensaje:
        'La contraseña debe tener al menos 8 caracteres y no superar los 72 bytes.'
    })
  }

  let conexion

  try {
    // Proteger contraseña mediante hash
    const contrasenaHash = await bcrypt.hash(contrasena, 12)

    // Obtener conexión e iniciar transacción
    conexion = await pool.getConnection()
    await conexion.beginTransaction()

    // Crear cuenta de usuario
    const [resultadoUsuario] = await conexion.execute(
      `INSERT INTO usuarios
       (nombre_usuario, correo, contrasena_hash, rol)
       VALUES (?, ?, ?, 'cliente')`,
      [usuarioLimpio, correoLimpio, contrasenaHash]
    )

    const idUsuario = resultadoUsuario.insertId

    // Crear registro del cliente
    const [resultadoCliente] = await conexion.execute(
      `INSERT INTO clientes
       (id_usuario, nombre, apellido, telefono, correo_contacto)
       VALUES (?, ?, ?, ?, ?)`,
      [
        idUsuario,
        nombreLimpio,
        apellidoLimpio,
        telefonoLimpio || null,
        correoLimpio
      ]
    )

    // Confirmar ambos registros
    await conexion.commit()

    res.status(201).json({
      mensaje: 'Cuenta creada correctamente.',
      usuario: {
        id_usuario: idUsuario,
        id_cliente: resultadoCliente.insertId,
        nombre_usuario: usuarioLimpio,
        nombre: nombreLimpio,
        apellido: apellidoLimpio,
        rol: 'cliente'
      }
    })
  } catch (error) {
    // Revertir cambios si ocurre un error
    if (conexion) {
      try {
        await conexion.rollback()
      } catch (rollbackError) {
        console.error('Error al revertir:', rollbackError)
      }
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'El nombre de usuario o correo ya están registrados.'
      })
    }

    console.error('Error en registro:', error)

    res.status(500).json({
      mensaje: 'No se pudo registrar el usuario.'
    })
  } finally {
    if (conexion) {
      conexion.release()
    }
  }
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`)
})
