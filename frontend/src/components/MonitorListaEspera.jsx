import { useCallback, useEffect, useRef, useState } from 'react'

import { confirmarReservaListaEsperaApi } from '../services/hotelApi'
import { obtenerMensajeError, formatearFechaCorta } from '../utils/hotelHelpers'

const ESTADO_ESPERANDO = 'esperando'
const ESTADO_RETENIDA = 'retenida'
const ESTADO_EXPIRADA = 'expirada'
const ESTADO_CONFIRMADA = 'confirmada'
const ESTADO_ERROR_WS = 'error_ws'

export default function MonitorListaEspera({ entradaId, onReiniciar }) {
  const [estadoMonitor, setEstadoMonitor] = useState(ESTADO_ESPERANDO)
  const [datosRetencion, setDatosRetencion] = useState(null)
  const [segundosRestantes, setSegundosRestantes] = useState(0)
  const [confirmando, setConfirmando] = useState(false)
  const [errorConfirmar, setErrorConfirmar] = useState('')
  const [reservaConfirmada, setReservaConfirmada] = useState(null)
  const [wsConectado, setWsConectado] = useState(false)

  const wsRef = useRef(null)
  const intervaloRef = useRef(null)
  const estadoMonitorRef = useRef(estadoMonitor)

  const limpiarIntervalo = useCallback(() => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current)
      intervaloRef.current = null
    }
  }, [])

  const iniciarCountdown = useCallback((expiraEn) => {
    limpiarIntervalo()

    const fechaExpiracion = new Date(expiraEn).getTime()

    function actualizarTiempo() {
      const ahora = Date.now()
      const restante = Math.max(0, Math.floor((fechaExpiracion - ahora) / 1000))
      setSegundosRestantes(restante)

      if (restante <= 0) {
        limpiarIntervalo()
      }
    }

    actualizarTiempo()
    intervaloRef.current = setInterval(actualizarTiempo, 1000)
  }, [limpiarIntervalo])

  useEffect(() => {
    estadoMonitorRef.current = estadoMonitor
  }, [estadoMonitor])

  useEffect(() => {
    if (!entradaId) return

    const protocolo = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${protocolo}://${window.location.host}/ws/lista-espera/${entradaId}/`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConectado(true)
      setEstadoMonitor(ESTADO_ESPERANDO)
    }

    ws.onmessage = (evento) => {
      try {
        const datos = JSON.parse(evento.data)

        if (datos.tipo === 'retencion_asignada') {
          setDatosRetencion(datos)
          setEstadoMonitor(ESTADO_RETENIDA)
          iniciarCountdown(datos.expira_en)
        }

        if (datos.tipo === 'retencion_expirada') {
          setEstadoMonitor(ESTADO_EXPIRADA)
          limpiarIntervalo()
        }
      } catch {
        console.warn('MonitorListaEspera: mensaje WS no parseable.')
      }
    }

    ws.onclose = (evento) => {
      setWsConectado(false)
      if (evento.code === 4001) {
        console.warn('WebSocket: token JWT invalido.')
      }
      if (evento.code === 4004) {
        console.warn('WebSocket: entrada no encontrada.')
      }
      if (evento.code !== 1000 && estadoMonitorRef.current === ESTADO_ESPERANDO) {
        setEstadoMonitor(ESTADO_ERROR_WS)
      }
    }

    ws.onerror = () => {
      console.warn('MonitorListaEspera: error en WebSocket.')
    }

    return () => {
      limpiarIntervalo()
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }
  }, [entradaId, iniciarCountdown, limpiarIntervalo])

  async function manejarConfirmar() {
    setErrorConfirmar('')
    setConfirmando(true)

    try {
      const { response, data } = await confirmarReservaListaEsperaApi(entradaId)

      if (!response.ok) {
        setErrorConfirmar(obtenerMensajeError(data, 'No se pudo confirmar la reservacion.'))
        return
      }

      setEstadoMonitor(ESTADO_CONFIRMADA)
      setReservaConfirmada(data)
      limpiarIntervalo()
    } catch {
      setErrorConfirmar('Error de conexion al confirmar.')
    } finally {
      setConfirmando(false)
    }
  }

  function formatearTiempo(totalSegundos) {
    const minutos = Math.floor(totalSegundos / 60)
    const segundos = totalSegundos % 60
    return `${minutos}:${String(segundos).padStart(2, '0')}`
  }

  if (estadoMonitor === ESTADO_CONFIRMADA && reservaConfirmada) {
    return (
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body text-center py-5">
          <i className="bi bi-check-circle display-3 d-block mb-3" style={{ color: 'var(--hotel-color-primario)' }} />
          <h4>¡Reservación confirmada!</h4>
          <p className="text-secondary">
            Tu código de reservación es: <strong>{reservaConfirmada.codigo || reservaConfirmada.id}</strong>
          </p>
          {datosRetencion && (
            <p className="text-secondary">
              Habitación {datosRetencion.habitacion_numero} — {formatearFechaCorta(datosRetencion.fecha_entrada_asignada)} al {formatearFechaCorta(datosRetencion.fecha_salida_asignada)}
            </p>
          )}
          <button type="button" className="btn btn-hotel-primary mt-3" onClick={onReiniciar}>
            <i className="bi bi-arrow-repeat me-2" />
            Nueva solicitud
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h3 className="h5 mb-0">
            <i className="bi bi-broadcast me-2" />
            Monitor de espera
          </h3>
          <span className={`badge rounded-pill ${wsConectado ? 'text-bg-success' : 'text-bg-secondary'}`}>
            {wsConectado ? 'Conectado' : 'Desconectado'}
          </span>
        </div>

        {estadoMonitor === ESTADO_ESPERANDO && (
          <div className="rounded-4 p-4 text-center" style={{ backgroundColor: 'var(--hotel-color-secundario)' }}>
            <div className="spinner-border mb-3" role="status" style={{ color: 'var(--hotel-color-primario)' }}>
              <span className="visually-hidden">Esperando...</span>
            </div>
            <h5>Esperando disponibilidad</h5>
            <p className="text-secondary mb-0">
              Recibirás una notificación en tiempo real si se libera una habitación compatible. Mantén esta página abierta.
            </p>
          </div>
        )}

        {estadoMonitor === ESTADO_ERROR_WS && (
          <div className="alert alert-warning rounded-4" role="alert">
            <i className="bi bi-wifi-off me-2" />
            No se pudo conectar al monitor en tiempo real. Verifica tu conexión e intenta de nuevo.
            <button type="button" className="btn btn-sm btn-outline-warning ms-3" onClick={onReiniciar}>
              Reintentar
            </button>
          </div>
        )}

        {estadoMonitor === ESTADO_RETENIDA && datosRetencion && (
          <div className="rounded-4 p-4 text-center" style={{ backgroundColor: 'var(--hotel-color-secundario)' }}>
            <i className="bi bi-bell-fill display-5 d-block mb-2" style={{ color: 'var(--hotel-color-primario)' }} />
            <h4>¡Habitación disponible!</h4>
            <p className="text-secondary mb-1">
              <strong>Habitación {datosRetencion.habitacion_numero}</strong>
            </p>
            <p className="text-secondary mb-3">
              {formatearFechaCorta(datosRetencion.fecha_entrada_asignada)} al {formatearFechaCorta(datosRetencion.fecha_salida_asignada)}
            </p>

            <div className="mb-3">
              <p className="small text-secondary mb-1">Tiempo restante para confirmar</p>
              <div className={`countdown-display ${segundosRestantes <= 60 ? 'text-danger' : ''}`}
                style={{ color: segundosRestantes > 60 ? 'var(--hotel-color-primario)' : undefined }}
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
              className="btn btn-hotel-primary btn-lg px-5 py-3"
              onClick={manejarConfirmar}
              disabled={confirmando || segundosRestantes <= 0}
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
          </div>
        )}

        {estadoMonitor === ESTADO_EXPIRADA && (
          <div className="rounded-4 p-4 text-center" style={{ backgroundColor: '#fef2f2' }}>
            <i className="bi bi-clock-history display-5 d-block mb-2 text-danger" />
            <h5 className="text-danger">El tiempo expiró</h5>
            <p className="text-secondary mb-3">
              La habitación fue asignada al siguiente en la lista. Puedes crear una nueva solicitud.
            </p>
            <button type="button" className="btn btn-outline-secondary" onClick={onReiniciar}>
              <i className="bi bi-arrow-repeat me-2" />
              Nueva solicitud
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
