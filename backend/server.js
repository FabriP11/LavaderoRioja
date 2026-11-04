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

// Middleware para verificar que el usuario tenga rol de cliente
async function verificarCliente (req, res, next) {
  const token = req.cookies?.lavadero_sesion

  if (!token) {
    return res.status(401).json({
      mensaje: 'Debés iniciar sesión.'
    })
  }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    })

    const [clientes] = await pool.execute(
      `SELECT id_cliente
       FROM clientes
       WHERE id_usuario = ?
       LIMIT 1`,
      [datos.id_usuario]
    )

    if (clientes.length === 0) {
      return res.status(403).json({
        mensaje: 'Esta operación requiere una cuenta de cliente.'
      })
    }

    req.idCliente = clientes[0].id_cliente
    next()
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

    console.error('Error de autenticación:', error)

    return res.status(500).json({
      mensaje: 'No se pudo verificar la sesión.'
    })
  }
}

// Obtener vehículos del cliente
app.get('/api/vehiculos', verificarCliente, async (req, res) => {
  try {
    const [vehiculos] = await pool.execute(
      `SELECT *
       FROM vehiculos
       WHERE id_cliente = ?
       ORDER BY id_vehiculo DESC`,
      [req.idCliente]
    )

    res.json({ vehiculos })
  } catch (error) {
    console.error('Error al consultar vehículos:', error)

    res.status(500).json({
      mensaje: 'No se pudieron obtener los vehículos.'
    })
  }
})

// Registrar un nuevo vehículo para el cliente
app.post('/api/vehiculos', verificarCliente, async (req, res) => {
  const { patente, marca, modelo } = req.body || {}

  // Validar tipos de datos
  if (
    typeof patente !== 'string' ||
    typeof marca !== 'string' ||
    typeof modelo !== 'string'
  ) {
    return res.status(400).json({
      mensaje: 'Completá todos los datos del vehículo.'
    })
  }

  // Limpiar los datos
  const patenteLimpia = patente.trim().toUpperCase().replace(/[\s-]/g, '')

  const marcaLimpia = marca.trim()
  const modeloLimpio = modelo.trim()

  if (!marcaLimpia || !modeloLimpio) {
    return res.status(400).json({
      mensaje: 'La marca y el modelo son obligatorios.'
    })
  }

  if (!/^[A-Z0-9]{6,10}$/.test(patenteLimpia)) {
    return res.status(400).json({
      mensaje: 'Ingresá una patente válida, sin símbolos.'
    })
  }

  if (marcaLimpia.length > 50 || modeloLimpio.length > 50) {
    return res.status(400).json({
      mensaje: 'La marca y el modelo son demasiado largos.'
    })
  }

  try {
    // Comprobar si ya está registrada
    const [existentes] = await pool.execute(
      'SELECT id_vehiculo FROM vehiculos WHERE patente = ? LIMIT 1',
      [patenteLimpia]
    )

    if (existentes.length > 0) {
      return res.status(409).json({
        mensaje: 'Esta patente ya está registrada.'
      })
    }

    // Crear vehículo asociado al cliente autenticado
    const [resultado] = await pool.execute(
      `INSERT INTO vehiculos
       (id_cliente, patente, marca, modelo)
       VALUES (?, ?, ?, ?)`,
      [req.idCliente, patenteLimpia, marcaLimpia, modeloLimpio]
    )

    // Recuperar el vehículo creado
    const [vehiculos] = await pool.execute(
      `SELECT *
       FROM vehiculos
       WHERE id_vehiculo = ?
         AND id_cliente = ?`,
      [resultado.insertId, req.idCliente]
    )

    return res.status(201).json({
      mensaje: 'Vehículo registrado correctamente.',
      vehiculo: vehiculos[0]
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Esta patente ya está registrada.'
      })
    }

    console.error('Error al registrar vehículo:', error)

    return res.status(500).json({
      mensaje: 'No se pudo registrar el vehículo.'
    })
  }
})

// Editar un vehículo del cliente
app.put('/api/vehiculos/:id', verificarCliente, async (req, res) => {
  const idVehiculo = Number(req.params.id)
  const { patente, marca, modelo } = req.body || {}

  // Validar el identificador
  if (!Number.isSafeInteger(idVehiculo) || idVehiculo <= 0) {
    return res.status(400).json({
      mensaje: 'El identificador del vehículo es inválido.'
    })
  }

  // Validar los datos recibidos
  if (
    typeof patente !== 'string' ||
    typeof marca !== 'string' ||
    typeof modelo !== 'string'
  ) {
    return res.status(400).json({
      mensaje: 'Completá todos los datos del vehículo.'
    })
  }

  const patenteLimpia = patente.trim().toUpperCase().replace(/[\s-]/g, '')

  const marcaLimpia = marca.trim()
  const modeloLimpio = modelo.trim()

  if (
    !/^[A-Z0-9]{6,10}$/.test(patenteLimpia) ||
    !marcaLimpia ||
    !modeloLimpio ||
    marcaLimpia.length > 50 ||
    modeloLimpio.length > 50
  ) {
    return res.status(400).json({
      mensaje: 'Verificá los datos del vehículo.'
    })
  }

  try {
    // Comprobar que el vehículo pertenece al cliente
    const [existentes] = await pool.execute(
      `SELECT id_vehiculo
       FROM vehiculos
       WHERE id_vehiculo = ?
         AND id_cliente = ?
       LIMIT 1`,
      [idVehiculo, req.idCliente]
    )

    if (existentes.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el vehículo.'
      })
    }

    // Evitar que la patente esté registrada en otro vehículo
    const [patentes] = await pool.execute(
      `SELECT id_vehiculo
       FROM vehiculos
       WHERE patente = ?
         AND id_vehiculo <> ?
       LIMIT 1`,
      [patenteLimpia, idVehiculo]
    )

    if (patentes.length > 0) {
      return res.status(409).json({
        mensaje: 'Esta patente ya está registrada.'
      })
    }

    // Actualizar únicamente el vehículo del cliente
    await pool.execute(
      `UPDATE vehiculos
       SET patente = ?, marca = ?, modelo = ?
       WHERE id_vehiculo = ?
         AND id_cliente = ?`,
      [patenteLimpia, marcaLimpia, modeloLimpio, idVehiculo, req.idCliente]
    )

    // Recuperar los datos actualizados
    const [vehiculos] = await pool.execute(
      `SELECT *
       FROM vehiculos
       WHERE id_vehiculo = ?
         AND id_cliente = ?`,
      [idVehiculo, req.idCliente]
    )

    return res.json({
      mensaje: 'Vehículo actualizado correctamente.',
      vehiculo: vehiculos[0]
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Esta patente ya está registrada.'
      })
    }

    console.error('Error al editar vehículo:', error)

    return res.status(500).json({
      mensaje: 'No se pudo actualizar el vehículo.'
    })
  }
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`)
})
