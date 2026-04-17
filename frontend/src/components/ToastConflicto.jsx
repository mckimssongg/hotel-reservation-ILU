import { useEffect } from 'react'

export default function ToastConflicto({ mensaje, visible, onCerrar }) {
  useEffect(() => {
    if (!visible) {
      return
    }

    const timer = setTimeout(() => {
      onCerrar()
    }, 6000)

    return () => clearTimeout(timer)
  }, [visible, onCerrar])

  if (!visible) {
    return null
  }

  return (
    <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
      <div className="toast show border-0 shadow rounded-4" role="alert" aria-live="assertive" aria-atomic="true">
        <div className="toast-header bg-danger text-white rounded-top-4">
          <i className="bi bi-exclamation-triangle-fill me-2" />
          <strong className="me-auto">Habitacion no disponible</strong>
          <button type="button" className="btn-close btn-close-white" onClick={onCerrar} aria-label="Cerrar" />
        </div>
        <div className="toast-body">
          {mensaje || 'Lo sentimos, otro huesped acaba de reservar esta habitacion. Intenta con otra habitacion o rango de fechas.'}
        </div>
      </div>
    </div>
  )
}
