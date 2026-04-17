import { useState } from 'react'

import { useAuth } from '../hooks/useAuth'
import { cancelarReservaApi } from '../services/hotelApi'
import { formatearFechaCorta, obtenerMensajeError } from '../utils/hotelHelpers'

export default function ModalCancelarReserva({ abierto, reserva, onCerrar, onCancelacionExitosa }) {
  const { ejecutarConAuth } = useAuth()
  
  const [cancelando, setCancelando] = useState(false)
  const [error, setError] = useState('')

  if (!abierto || !reserva) {
    return null
  }

  async function confirmarCancelacion() {
    setCancelando(true)
    setError('')

    const { response, data } = await ejecutarConAuth((access) => cancelarReservaApi(reserva.id, access))
    
    setCancelando(false)
    
    if (!response.ok) {
      setError(obtenerMensajeError(data, 'No se pudo cancelar la reservacion.'))
      return
    }

    if (onCancelacionExitosa) {
      onCancelacionExitosa()
    }
  }

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center p-3" style={{ zIndex: 1080 }} onClick={onCerrar}>
      <div className="card border-0 rounded-4 shadow-sm w-100" style={{ maxWidth: 500 }} onClick={(event) => event.stopPropagation()}>
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h3 className="h5 mb-0 text-danger">
              <i className="bi bi-exclamation-triangle me-2" />
              Cancelar Reservacion
            </h3>
            <button type="button" className="btn-close" onClick={onCerrar} aria-label="Cerrar" />
          </div>
          
          {error ? <div className="alert alert-danger py-2">{error}</div> : null}
          
          <p className="mb-3">
            Estas seguro de que deseas cancelar la reservacion de la <strong>Habitacion {reserva.habitacion?.numero || '-'}</strong> ({formatearFechaCorta(reserva.fecha_entrada)} al {formatearFechaCorta(reserva.fecha_salida)})?
          </p>
          <p className="mb-4 text-secondary small">Esta accion no se puede deshacer y la habitacion quedara disponible para otros huespedes.</p>
          
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={onCerrar} disabled={cancelando}>
              No, mantener
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmarCancelacion} disabled={cancelando}>
              {cancelando ? 'Cancelando...' : 'Si, cancelar reservacion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
