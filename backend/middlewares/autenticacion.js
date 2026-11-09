const jwt = require('jsonwebtoken')
const pool = require('../db')

// Verificar que el usuario sea cliente
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

// Verificar que el usuario sea administrador
async function verificarAdministrador (req, res, next) {
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

    const idUsuario = Number(datos.id_usuario)

    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
      return res.status(401).json({
        mensaje: 'Sesión inválida.'
      })
    }

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

module.exports = {
  verificarCliente,
  verificarAdministrador
}
