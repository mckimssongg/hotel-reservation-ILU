import { useCallback, useEffect, useRef, useState } from 'react'

import { confirmarReservaListaEsperaApi } from '../services/hotelApi'
import { formatearFechaCorta, obtenerMensajeError } from '../utils/hotelHelpers'

export default function ModalNotificacionEspera({ datosRetencion, onConfirmada, onExpirada, onCerrar }) {
  const [segundosRestantes, setSegundosRestantes] = useState(0)
  const [confirmando, setConfirmando] = useState(false)
  const [errorConfirmar, setErrorConfirmar] = useState('')
  const [reservaConfirmada, setReservaConfirmada] = useState(null)
  const intervaloRef = useRef(null)

  const limpiarIntervalo = useCallback(() => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current)
      intervaloRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!datosRetencion?.expira_en) return

    limpiarIntervalo()
    const fechaExpiracion = new Date(datosRetencion.expira_en).getTime()

    function actualizarTiempo() {
      const restante = Math.max(0, Math.floor((fechaExpiracion - Date.now()) / 1000))
      setSegundosRestantes(restante)

      if (restante <= 0) {
        limpiarIntervalo()
        if (onExpirada) onExpirada()
      }
    }

    actualizarTiempo()
    intervaloRef.current = setInterval(actualizarTiempo, 1000)

    return limpiarIntervalo
  }, [datosRetencion?.expira_en, limpiarIntervalo, onExpirada])

  async function manejarConfirmar() {
    setErrorConfirmar('')
    setConfirmando(true)

    try {
      const { response, data } = await confirmarReservaListaEsperaApi(datosRetencion.entrada_id)

      if (!response.ok) {
        setErrorConfirmar(obtenerMensajeError(data, 'No se pudo confirmar la reservación.'))
        return
      }

      setReservaConfirmada(data)
      limpiarIntervalo()
      if (onConfirmada) onConfirmada(data)
    } catch {
      setErrorConfirmar('Error de conexión al confirmar.')
    } finally {
      setConfirmando(false)
    }
  }

  function formatearTiempo(totalSegundos) {
    const minutos = Math.floor(totalSegundos / 60)
    const segundos = totalSegundos % 60
    return `${minutos}:${String(segundos).padStart(2, '0')}`
  }

  if (!datosRetencion) return null

  if (reservaConfirmada) {
    return (
      <div className="modal-notificacion-backdrop" onClick={onCerrar}>
        <div className="modal-notificacion-contenido" onClick={(e) => e.stopPropagation()}>
          <div className="text-center py-4">
            <i className="bi bi-check-circle display-3 d-block mb-3" style={{ color: 'var(--hotel-color-primario)' }} />
            <h4>¡Reservación confirmada!</h4>
            <p className="text-secondary">
              Tu código de reservación es: <strong>{reservaConfirmada.codigo_reserva || reservaConfirmada.id}</strong>
            </p>
            <p className="text-secondary mb-0">
              Habitación {datosRetencion.habitacion_numero} — {formatearFechaCorta(datosRetencion.fecha_entrada_asignada)} al {formatearFechaCorta(datosRetencion.fecha_salida_asignada)}
            </p>
            <button type="button" className="btn btn-hotel-primary mt-4 px-4" onClick={onCerrar}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-notificacion-backdrop">
      <div className="modal-notificacion-contenido" onClick={(e) => e.stopPropagation()}>
        <div className="text-center py-3">
          <i className="bi bi-bell-fill display-4 d-block mb-3" style={{ color: 'var(--hotel-color-primario)' }} />

          <h4 className="mb-1">¡Buenas noticias!</h4>
          <p className="text-secondary mb-3">Se liberó una habitación compatible.</p>

          <div className="rounded-3 p-3 mb-3" style={{ backgroundColor: 'var(--hotel-color-secundario)' }}>
            <div className="fw-semibold mb-1" style={{ color: 'var(--hotel-color-primario)' }}>
              Habitación {datosRetencion.habitacion_numero}
            </div>
            <div className="small text-secondary">
              {formatearFechaCorta(datosRetencion.fecha_entrada_asignada)} al {formatearFechaCorta(datosRetencion.fecha_salida_asignada)}
            </div>
          </div>

          <div className="mb-3">
            <p className="small text-secondary mb-1">Tiempo restante para confirmar</p>
            <div
              className="countdown-display"
              style={{ color: segundosRestantes <= 60 ? '#dc3545' : 'var(--hotel-color-primario)' }}
            >
              {formatearTiempo(segundosRestantes)}
            </div>
          </div>

          {errorConfirmar && (
            <div className="alert alert-danger rounded-3 mb-3" role="alert">
              {errorConfirmar}
            </div>
          )}

          <button
            type="button"
            className="btn btn-hotel-primary btn-lg px-5 py-3 w-100"
            onClick={manejarConfirmar}
            disabled={confirmando || segundosRestantes <= 0}
            style={{ fontSize: '1.1rem' }}
          >
            {confirmando ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Confirmando...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2" />
                Confirmar Reservación
              </>
            )}
          </button>

          {segundosRestantes <= 0 && (
            <div className="mt-3 text-danger small">
              <i className="bi bi-clock-history me-1" />
              El tiempo ha expirado. La habitación fue liberada.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
