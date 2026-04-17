export const AUTH_STORAGE_KEY = 'hotel_auth_session_v1'

export const filtrosDisponibilidadIniciales = {
  fecha_entrada: '',
  fecha_salida: '',
  cantidad_huespedes: 2,
  tipo_habitacion: '',
}

export const credencialesIniciales = {
  usuario: '',
  clave: '',
}

export const registroInicial = {
  usuario: '',
  nombre: '',
  apellido: '',
  correo: '',
  clave: '',
}

export const filtrosDashboardIniciales = {
  estado: '',
}

export const estadoReservaBadgeMap = {
  PENDIENTE: 'text-bg-warning',
  CONFIRMADA: 'text-bg-success',
  REGISTRADA_ENTRADA: 'text-bg-info',
  REGISTRADA_SALIDA: 'text-bg-secondary',
  CANCELADA: 'text-bg-danger',
}

export const estadoReservaTextoMap = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  REGISTRADA_ENTRADA: 'En estadia',
  REGISTRADA_SALIDA: 'Finalizada',
  CANCELADA: 'Cancelada',
}
