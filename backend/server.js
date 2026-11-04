require('dotenv').config()

const express = require('express')
const cors = require('cors')
const pool = require('./db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
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

// Inicio de sesión
app.post('/api/login', async (req, res) => {
  const { identificador, contrasena } = req.body || {}

  if (
    typeof identificador !== 'string' ||
    typeof contrasena !== 'string' ||
    !identificador.trim() ||
    !contrasena
  ) {
    return res.status(400).json({
      mensaje: 'Ingresá tu usuario o correo y contraseña.'
    })
  }

  try {
    // Buscar usuario por nombre o correo
    const [usuarios] = await pool.execute(
      `SELECT
        u.id_usuario,
        u.nombre_usuario,
        u.correo,
        u.contrasena_hash,
        u.rol,
        c.id_cliente,
        c.nombre,
        c.apellido
       FROM usuarios u
       LEFT JOIN clientes c
         ON u.id_usuario = c.id_usuario
       WHERE u.nombre_usuario = ?
          OR u.correo = ?
       LIMIT 1`,
      [identificador.trim(), identificador.trim()]
    )

    const usuario = usuarios[0]

    if (!usuario) {
      return res.status(401).json({
        mensaje: 'Usuario o contraseña incorrectos.'
      })
    }

    // Verificar contraseña
    const contrasenaValida = await bcrypt.compare(
      contrasena,
      usuario.contrasena_hash
    )

    if (!contrasenaValida) {
      return res.status(401).json({
        mensaje: 'Usuario o contraseña incorrectos.'
      })
    }

    // Generar token de sesión
    const token = jwt.sign(
      { id_usuario: usuario.id_usuario },
      process.env.JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: '7d'
      }
    )

    // Guardar sesión en una cookie
    res.cookie('lavadero_sesion', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({
      mensaje: 'Inicio de sesión exitoso.',
      usuario: {
        id_usuario: usuario.id_usuario,
        id_cliente: usuario.id_cliente,
        nombre_usuario: usuario.nombre_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol
      }
    })
  } catch (error) {
    console.error('Error en login:', error)

    res.status(500).json({
      mensaje: 'No se pudo iniciar sesión.'
    })
  }
})

// Comprobar sesión activa
app.get('/api/sesion', async (req, res) => {
  const token = req.cookies.lavadero_sesion

  if (!token) {
    return res.status(401).json({
      mensaje: 'No hay una sesión iniciada.'
    })
  }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    })

    const idUsuario = Number(datos.id_usuario)

    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
      return res.status(401).json({
        mensaje: 'Sesión inválida.'
      })
    }

    const [usuarios] = await pool.execute(
      `SELECT
        u.id_usuario,
        u.nombre_usuario,
        u.rol,
        c.id_cliente,
        c.nombre,
        c.apellido
       FROM usuarios u
       LEFT JOIN clientes c
         ON u.id_usuario = c.id_usuario
       WHERE u.id_usuario = ?
       LIMIT 1`,
      [idUsuario]
    )

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensaje: 'Usuario no encontrado.'
      })
    }

    res.json({
      usuario: usuarios[0]
    })
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        mensaje: 'Sesión inválida o expirada.'
      })
    }

    console.error('Error al consultar sesión:', error)

    res.status(500).json({
      mensaje: 'No se pudo consultar la sesión.'
    })
  }
})

// Cerrar sesión
app.post('/api/logout', (req, res) => {
  res.clearCookie('lavadero_sesion', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  })

  res.json({
    mensaje: 'Sesión cerrada correctamente.'
  })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`)
})
