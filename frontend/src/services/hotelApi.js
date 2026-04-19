const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

async function peticion(url, opciones = {}) {
  const response = await fetch(url, opciones)
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  return { response, data }
}

function armarHeadersJson(headers = {}) {
  return {
    'Content-Type': 'application/json',
    ...headers,
  }
}

function armarHeaderAuth(accessToken) {
  if (!accessToken) {
    return {}
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

export async function obtenerTiposHabitacion() {
  return peticion(`${API_BASE_URL}/tipos-habitacion/?page_size=100`)
}

export async function obtenerDisponibilidad(queryParams) {
  return peticion(`${API_BASE_URL}/habitaciones/disponibles/?${queryParams}`)
}

export async function crearReservaApi(payload) {
  return peticion(`${API_BASE_URL}/reservas/`, {
    method: 'POST',
    headers: armarHeadersJson(),
    body: JSON.stringify(payload),
  })
}

export async function registrarUsuarioApi(payload) {
  return peticion(`${API_BASE_URL}/usuarios/`, {
    method: 'POST',
    headers: armarHeadersJson(),
    body: JSON.stringify(payload),
  })
}

export async function iniciarSesionUsuarioApi(credenciales) {
  return peticion(`${API_BASE_URL}/usuarios/iniciar-sesion/`, {
    method: 'POST',
    headers: armarHeadersJson(),
    body: JSON.stringify(credenciales),
  })
}

export async function refrescarTokenUsuarioApi(refresh) {
  return peticion(`${API_BASE_URL}/usuarios/refrescar-token/`, {
    method: 'POST',
    headers: armarHeadersJson(),
    body: JSON.stringify({ refresh }),
  })
}

export async function cerrarSesionUsuarioApi(refresh) {
  return peticion(`${API_BASE_URL}/usuarios/cerrar-sesion/`, {
    method: 'POST',
    headers: armarHeadersJson(),
    body: JSON.stringify({ refresh }),
  })
}

export async function obtenerMiPerfilApi(accessToken) {
  return peticion(`${API_BASE_URL}/usuarios/mi-perfil/`, {
    headers: armarHeaderAuth(accessToken),
  })
}

export async function obtenerReservasApi(queryParams, accessToken) {
  return peticion(`${API_BASE_URL}/reservas/?${queryParams}`, {
    headers: armarHeaderAuth(accessToken),
  })
}

export async function cancelarReservaApi(reservaId, accessToken) {
  return peticion(`${API_BASE_URL}/reservas/${reservaId}/`, {
    method: 'DELETE',
    headers: armarHeaderAuth(accessToken),
  })
}

export async function registrarEntradaReservaApi(reservaId, accessToken) {
  return peticion(`${API_BASE_URL}/reservas/${reservaId}/registrar-entrada/`, {
    method: 'POST',
    headers: armarHeaderAuth(accessToken),
  })
}

export async function registrarSalidaReservaApi(reservaId, accessToken) {
  return peticion(`${API_BASE_URL}/reservas/${reservaId}/registrar-salida/`, {
    method: 'POST',
    headers: armarHeaderAuth(accessToken),
  })
}

export async function cotizarModificacionReservaApi(reservaId, payload, accessToken) {
  return peticion(`${API_BASE_URL}/reservas/${reservaId}/cotizar-modificacion/`, {
    method: 'POST',
    headers: {
      ...armarHeadersJson(),
      ...armarHeaderAuth(accessToken),
    },
    body: JSON.stringify(payload),
  })
}

export async function confirmarModificacionReservaApi(reservaId, payload, accessToken) {
  return peticion(`${API_BASE_URL}/reservas/${reservaId}/confirmar-modificacion/`, {
    method: 'POST',
    headers: {
      ...armarHeadersJson(),
      ...armarHeaderAuth(accessToken),
    },
    body: JSON.stringify(payload),
  })
}

export async function obtenerPrecioHabitacionApi(habitacionId, queryParams) {
  return peticion(`${API_BASE_URL}/habitaciones/${habitacionId}/precio/?${queryParams}`)
}

export async function obtenerCalendarioMensualApi(queryParams) {
  return peticion(`${API_BASE_URL}/habitaciones/calendario-mensual/?${queryParams}`)
}

export async function obtenerEstadisticasDashboardApi(queryParams, accessToken) {
  return peticion(`${API_BASE_URL}/estadisticas/?${queryParams}`, {
    headers: armarHeaderAuth(accessToken),
  })
}

export async function crearEntradaListaEsperaApi(payload) {
  return peticion(`${API_BASE_URL}/lista-espera/`, {
    method: 'POST',
    headers: armarHeadersJson(),
    body: JSON.stringify(payload),
  })
}

export async function confirmarReservaListaEsperaApi(entradaId) {
  return peticion(`${API_BASE_URL}/lista-espera/${entradaId}/confirmar/`, {
    method: 'POST',
    headers: armarHeadersJson(),
  })
}

export async function obtenerEntradasListaEsperaApi(accessToken) {
  return peticion(`${API_BASE_URL}/lista-espera/?page_size=100`, {
    headers: armarHeaderAuth(accessToken),
  })
}
