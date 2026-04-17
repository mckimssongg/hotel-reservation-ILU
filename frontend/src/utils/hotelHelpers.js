export function obtenerMensajeError(data, fallback) {
  if (data?.mensaje) {
    return data.mensaje
  }
  if (typeof data?.detail === 'string') {
    return data.detail
  }
  if (data?.detail && typeof data.detail === 'object') {
    const primerCampo = Object.keys(data.detail)[0]
    const valor = data.detail[primerCampo]
    if (Array.isArray(valor) && valor.length > 0) {
      return `${primerCampo}: ${valor[0]}`
    }
    return `${primerCampo}: ${String(valor)}`
  }
  return fallback
}

export function formatearMoneda(valor, moneda = 'GTQ') {
  const numero = Number(valor || 0)
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: moneda,
  }).format(numero)
}

export function formatearFechaCorta(fechaISO) {
  if (!fechaISO) {
    return '-'
  }

  try {
    const fecha = new Date(`${fechaISO}T00:00:00`)
    return new Intl.DateTimeFormat('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(fecha)
  } catch {
    return fechaISO
  }
}

export function obtenerFechaISO(desplazamientoDias = 0) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + desplazamientoDias)
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export function ejecutarConViewTransition(callback) {
  if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
    document.startViewTransition(() => {
      callback()
    })
    return
  }

  callback()
}

export function extraerPagina(url) {
  if (!url) {
    return null
  }

  try {
    const urlCompleta = new URL(url, window.location.origin)
    const pagina = Number(urlCompleta.searchParams.get('page'))
    if (!Number.isFinite(pagina) || pagina < 1) {
      return null
    }
    return pagina
  } catch {
    return null
  }
}

export function validarRangoFechas(fechaEntrada, fechaSalida) {
  if (!fechaEntrada || !fechaSalida) {
    return 'Fecha entrada y fecha salida son requeridas.'
  }

  const hoy = new Date()
  const hoyLimpio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const entrada = new Date(`${fechaEntrada}T00:00:00`)
  const salida = new Date(`${fechaSalida}T00:00:00`)

  if (entrada < hoyLimpio) {
    return 'La fecha de entrada no puede ser pasada.'
  }

  if (salida <= entrada) {
    return 'La fecha de salida debe ser mayor a la fecha de entrada.'
  }

  return ''
}
