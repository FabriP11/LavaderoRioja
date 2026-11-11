const formateador = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Argentina/La_Rioja',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
})

// Convertir una hora HH:MM a minutos
function horaAMinutos (hora) {
  const [horas, minutos] = hora.split(':').map(Number)
  return horas * 60 + minutos
}

// Convertir minutos a una hora HH:MM
function minutosAHora (minutos) {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60

  return `${String(horas).padStart(2, '0')}:${String(resto).padStart(2, '0')}`
}

// Obtener fecha y hora actual de La Rioja
function obtenerPartesFechaHora () {
  return Object.fromEntries(
    formateador
      .formatToParts(new Date())
      .map(parte => [parte.type, parte.value])
  )
}

module.exports = {
  horaAMinutos,
  minutosAHora,
  obtenerPartesFechaHora
}
