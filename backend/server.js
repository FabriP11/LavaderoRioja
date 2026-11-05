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

// Middleware para verificar que el usuario tenga rol de administrador
async function verificarAdministrador (req, res, next) {
  const token = req.cookies?.lavadero_sesion

  if (!token) {
    return res.status(401).json({
      mensaje: 'Debés iniciar sesión.'
    })
  }

  try {
    // Verificar la cookie de autenticación
    const datos = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    })

    const idUsuario = Number(datos.id_usuario)

    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
      return res.status(401).json({
        mensaje: 'Sesión inválida.'
      })
    }

    // Consultar el rol actual desde MySQL
    const [usuarios] = await pool.execute(
      `SELECT id_usuario, nombre_usuario, rol
       FROM usuarios
       WHERE id_usuario = ?
       LIMIT 1`,
      [idUsuario]
    )

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensaje: 'Usuario no encontrado.'
      })
    }

    if (usuarios[0].rol !== 'administrador') {
      return res.status(403).json({
        mensaje: 'No tenés permisos de administrador.'
      })
    }

    req.admin = usuarios[0]

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

    console.error('Error de autenticación administrativa:', error)

    return res.status(500).json({
      mensaje: 'No se pudo verificar el acceso.'
    })
  }
}

// Consultar todos los turnos (solo para administradores)
app.get('/api/admin/turnos', verificarAdministrador, async (req, res) => {
  try {
    const [turnos] = await pool.execute(
      `SELECT
          t.id_turno,
          c.nombre AS cliente_nombre,
          c.apellido AS cliente_apellido,
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
         INNER JOIN clientes c
           ON t.id_cliente = c.id_cliente
         INNER JOIN vehiculos v
           ON t.id_vehiculo = v.id_vehiculo
         INNER JOIN servicios s
           ON t.id_servicio = s.id_servicio
         INNER JOIN puestos_lavado p
           ON t.id_puesto = p.id_puesto
         ORDER BY t.fecha_hora_inicio DESC, t.id_turno DESC`
    )

    return res.json({ turnos })
  } catch (error) {
    console.error('Error al consultar turnos:', error)

    return res.status(500).json({
      mensaje: 'No se pudieron obtener las reservas.'
    })
  }
})

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

// Eliminar un vehículo del cliente
app.delete('/api/vehiculos/:id', verificarCliente, async (req, res) => {
  const idVehiculo = Number(req.params.id)

  if (!Number.isSafeInteger(idVehiculo) || idVehiculo <= 0) {
    return res.status(400).json({
      mensaje: 'El identificador del vehículo es inválido.'
    })
  }

  try {
    // Verificar que el vehículo pertenece al cliente
    const [vehiculos] = await pool.execute(
      `SELECT id_vehiculo
       FROM vehiculos
       WHERE id_vehiculo = ?
         AND id_cliente = ?
       LIMIT 1`,
      [idVehiculo, req.idCliente]
    )

    if (vehiculos.length === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el vehículo.'
      })
    }

    // Verificar si tiene reservas asociadas
    const [turnos] = await pool.execute(
      `SELECT id_turno
       FROM turnos
       WHERE id_vehiculo = ?
       LIMIT 1`,
      [idVehiculo]
    )

    if (turnos.length > 0) {
      return res.status(409).json({
        mensaje:
          'No podés eliminar este vehículo porque tiene reservas asociadas.'
      })
    }

    // Eliminar solamente el vehículo del cliente
    const [resultado] = await pool.execute(
      `DELETE FROM vehiculos
       WHERE id_vehiculo = ?
         AND id_cliente = ?`,
      [idVehiculo, req.idCliente]
    )

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró el vehículo.'
      })
    }

    return res.json({
      mensaje: 'Vehículo eliminado correctamente.'
    })
  } catch (error) {
    // Protección adicional ante relaciones de clave foránea
    if (
      error.code === 'ER_ROW_IS_REFERENCED_2' ||
      error.code === 'ER_ROW_IS_REFERENCED'
    ) {
      return res.status(409).json({
        mensaje: 'No se puede eliminar porque tiene registros asociados.'
      })
    }

    console.error('Error al eliminar vehículo:', error)

    return res.status(500).json({
      mensaje: 'No se pudo eliminar el vehículo.'
    })
  }
})

// Consultar disponibilidad de horarios para un servicio en una fecha
app.get('/api/disponibilidad', async (req, res) => {
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

  const hoy = `${partes.year}-${partes.month}-${partes.day}`
  const ahora = `${hoy} ${partes.hour}:${partes.minute}:00`

  if (fecha < hoy) {
    return res.status(400).json({
      mensaje: 'No podés consultar fechas anteriores a hoy.'
    })
  }

  const horaAMinutos = hora => {
    const [horas, minutos] = hora.split(':').map(Number)
    return horas * 60 + minutos
  }

  const minutosAHora = minutos => {
    const horas = Math.floor(minutos / 60)
    const resto = minutos % 60

    return `${String(horas).padStart(2, '0')}:${String(resto).padStart(2, '0')}`
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

// Registrar un turno para el cliente
app.post('/api/turnos', verificarCliente, async (req, res) => {
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

    // Cada lectura tendrá los últimos datos confirmados.
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

    // Un mismo vehículo no puede tener dos turnos simultáneos
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
app.get('/api/mis-turnos', verificarCliente, async (req, res) => {
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
app.patch(
  '/api/mis-turnos/:id/cancelar',
  verificarCliente,
  async (req, res) => {
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
  }
)

// Cambiar el estado de un turno (solo para administradores)
app.patch(
  '/api/admin/turnos/:id/estado',
  verificarAdministrador,
  async (req, res) => {
    const idTurno = Number(req.params.id)
    const { estado } = req.body || {}

    if (!Number.isSafeInteger(idTurno) || idTurno <= 0) {
      return res.status(400).json({
        mensaje: 'El identificador del turno es inválido.'
      })
    }

    // Cada estado exige un estado anterior específico
    const estadosAnteriores = {
      en_proceso: 'reservado',
      finalizado: 'en_proceso',
      entregado: 'finalizado'
    }

    if (
      typeof estado !== 'string' ||
      !Object.hasOwn(estadosAnteriores, estado)
    ) {
      return res.status(400).json({
        mensaje: 'El estado solicitado no es válido.'
      })
    }

    try {
      // Consultar el estado actual del turno
      const [turnos] = await pool.execute(
        `SELECT id_turno, estado
         FROM turnos
         WHERE id_turno = ?
         LIMIT 1`,
        [idTurno]
      )

      if (turnos.length === 0) {
        return res.status(404).json({
          mensaje: 'No se encontró el turno.'
        })
      }

      const estadoActual = turnos[0].estado
      const estadoNecesario = estadosAnteriores[estado]

      if (estadoActual !== estadoNecesario) {
        return res.status(409).json({
          mensaje:
            'No se permite pasar de ' + estadoActual + ' a ' + estado + '.'
        })
      }

      // Actualizar solamente si el estado sigue siendo el esperado
      const [resultado] = await pool.execute(
        `UPDATE turnos
         SET estado = ?
         WHERE id_turno = ?
           AND estado = ?`,
        [estado, idTurno, estadoNecesario]
      )

      if (resultado.affectedRows === 0) {
        return res.status(409).json({
          mensaje: 'El turno fue modificado. Actualizá las reservas.'
        })
      }

      return res.json({
        mensaje: 'Estado actualizado correctamente.',
        turno: {
          id_turno: idTurno,
          estado
        }
      })
    } catch (error) {
      console.error('Error al actualizar estado:', error)

      return res.status(500).json({
        mensaje: 'No se pudo actualizar el estado del turno.'
      })
    }
  }
)

// Consultar agenda completa de un día (solo para administradores)
app.get('/api/admin/agenda', verificarAdministrador, async (req, res) => {
  const { fecha } = req.query

  // Validar la fecha solicitada
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

  try {
    // 1. Obtener los puestos del lavadero
    const [puestos] = await pool.execute(
      `SELECT id_puesto, nombre, activo
         FROM puestos_lavado
         ORDER BY id_puesto`
    )

    // 2. Obtener las reservas del día
    const [turnos] = await pool.execute(
      `SELECT
           t.id_turno,
           t.id_puesto,
           c.nombre AS cliente_nombre,
           c.apellido AS cliente_apellido,
           v.patente,
           v.marca,
           v.modelo,
           s.nombre AS servicio,
           DATE_FORMAT(
             t.fecha_hora_inicio,
             '%Y-%m-%d %H:%i:%s'
           ) AS inicio,
           DATE_FORMAT(
             t.fecha_hora_fin,
             '%Y-%m-%d %H:%i:%s'
           ) AS fin,
           t.estado
         FROM turnos t
         INNER JOIN clientes c
           ON t.id_cliente = c.id_cliente
         INNER JOIN vehiculos v
           ON t.id_vehiculo = v.id_vehiculo
         INNER JOIN servicios s
           ON t.id_servicio = s.id_servicio
         WHERE t.fecha_hora_inicio <
                 DATE_ADD(?, INTERVAL 1 DAY)
           AND t.fecha_hora_fin > ?
         ORDER BY t.fecha_hora_inicio`,
      [fecha, fecha]
    )

    // 3. Obtener los bloqueos de agenda
    const [bloqueos] = await pool.execute(
      `SELECT
           id_bloqueo,
           id_puesto,
           DATE_FORMAT(
             fecha_hora_inicio,
             '%Y-%m-%d %H:%i:%s'
           ) AS inicio,
           DATE_FORMAT(
             fecha_hora_fin,
             '%Y-%m-%d %H:%i:%s'
           ) AS fin,
           motivo
         FROM bloqueos_agenda
         WHERE fecha_hora_inicio <
                 DATE_ADD(?, INTERVAL 1 DAY)
           AND fecha_hora_fin > ?
         ORDER BY fecha_hora_inicio`,
      [fecha, fecha]
    )

    // 4. Organizar la información por puesto
    const agenda = puestos.map(puesto => ({
      ...puesto,

      turnos: turnos.filter(
        turno => Number(turno.id_puesto) === Number(puesto.id_puesto)
      ),

      bloqueos: bloqueos.filter(
        bloqueo =>
          bloqueo.id_puesto === null ||
          Number(bloqueo.id_puesto) === Number(puesto.id_puesto)
      )
    }))

    return res.json({
      fecha,
      puestos: agenda
    })
  } catch (error) {
    console.error('Error al consultar agenda:', error)

    return res.status(500).json({
      mensaje: 'No se pudo consultar la agenda.'
    })
  }
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`)
})
