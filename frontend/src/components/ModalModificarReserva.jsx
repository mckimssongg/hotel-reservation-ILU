import { useEffect, useState } from 'react'

import { useAuth } from '../hooks/useAuth'
import { cotizarModificacionReservaApi, confirmarModificacionReservaApi } from '../services/hotelApi'
import { formatearMoneda, obtenerMensajeError, validarRangoFechas } from '../utils/hotelHelpers'
import DesglosePrecio from './DesglosePrecio'

export default function ModalModificarReserva({ abierto, reserva, onCerrar, onModificacionExitosa }) {
  const { ejecutarConAuth } = useAuth()

  const [fechaEntrada, setFechaEntrada] = useState('')
  const [fechaSalida, setFechaSalida] = useState('')
  const [cotizacion, setCotizacion] = useState(null)
  const [cargandoCotizacion, setCargandoCotizacion] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState('')
  const [exitoMensaje, setExitoMensaje] = useState('')

  useEffect(() => {
    if (!abierto || !reserva) {
      return
    }

    setFechaEntrada(reserva.fecha_entrada || '')
    setFechaSalida(reserva.fecha_salida || '')
    setCotizacion(null)
    setCargandoCotizacion(false)
    setConfirmando(false)
    setError('')
    setExitoMensaje('')
  }, [abierto, reserva])

  if (!abierto || !reserva) {
    return null
  }

  async function cotizarCambio(event) {
    event.preventDefault()
    setError('')
    setCotizacion(null)

    const errorFechas = validarRangoFechas(fechaEntrada, fechaSalida)
    if (errorFechas) {
      setError(errorFechas)
      return
    }

    setCargandoCotizacion(true)

    try {
      const payload = {
        fecha_entrada: fechaEntrada,
        fecha_salida: fechaSalida,
        cantidad_huespedes: reserva.cantidad_huespedes,
      }

      const { response, data } = await ejecutarConAuth((access) =>
        cotizarModificacionReservaApi(reserva.id, payload, access)
      )

      if (!response.ok) {
        if (response.status === 409) {
          setError('No se puede modificar: hay un conflicto con otra reservacion en esas fechas.')
          return
        }
        setError(obtenerMensajeError(data, 'No se pudo cotizar la modificacion.'))
        return
      }

      setCotizacion(data)
    } catch {
      setError('No se pudo conectar con el backend para cotizar la modificacion.')
    } finally {
      setCargandoCotizacion(false)
    }
  }

  async function confirmarModificacion() {
    setError('')
    setConfirmando(true)

    try {
      const payload = {
        fecha_entrada: fechaEntrada,
        fecha_salida: fechaSalida,
        cantidad_huespedes: reserva.cantidad_huespedes,
        confirmar: true,
      }

      const { response, data } = await ejecutarConAuth((access) =>
        confirmarModificacionReservaApi(reserva.id, payload, access)
      )

      if (!response.ok) {
        if (response.status === 409) {
          setError('No se pudo confirmar: otro huesped reservo esta habitacion en esas fechas.')
          return
        }
        setError(obtenerMensajeError(data, 'No se pudo confirmar la modificacion.'))
        return
      }

      setExitoMensaje('Reservacion modificada exitosamente.')

      if (onModificacionExitosa) {
        onModificacionExitosa(data)
      }
    } catch {
      setError('No se pudo conectar con el backend para confirmar la modificacion.')
    } finally {
      setConfirmando(false)
    }
  }

  function renderSaldoFinal() {
    if (!cotizacion) {
      return null
    }

    const tipo = cotizacion.tipo_diferencia
    const diferencia = Number(cotizacion.diferencia || 0)

    if (tipo === 'sin_cambio') {
      return (
        <div className="alert alert-info py-2 mb-3">
          <i className="bi bi-check-circle me-1" />
          No hay diferencia de precio. El total se mantiene igual.
        </div>
      )
    }

    if (tipo === 'reembolso') {
      return (
        <div className="alert alert-success py-2 mb-3">
          <i className="bi bi-arrow-down-circle me-1" />
          Reembolso a su favor: <strong>{formatearMoneda(cotizacion.reembolso)}</strong>
        </div>
      )
    }

    if (tipo === 'cargo_adicional') {
      return (
        <div className="alert alert-warning py-2 mb-3">
          <i className="bi bi-arrow-up-circle me-1" />
          Cargo adicional: <strong>{formatearMoneda(cotizacion.cargo_adicional)}</strong>
        </div>
      )
    }

    return null
  }

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center p-3" style={{ zIndex: 1080 }} onClick={onCerrar}>
      <div className="card border-0 rounded-4 shadow-sm w-100" style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }} onClick={(event) => event.stopPropagation()}>
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h3 className="h4 mb-1">Modificar Fechas</h3>
              <p className="mb-0 text-secondary">
                Reserva {reserva.codigo_reserva} - Habitacion {reserva.habitacion?.numero || '-'}
              </p>
            </div>
            <button type="button" className="btn-close" onClick={onCerrar} aria-label="Cerrar" />
          </div>

          {error ? <div className="alert alert-danger py-2">{error}</div> : null}

          {exitoMensaje ? (
            <div className="alert alert-success py-2">
              <div className="fw-semibold">{exitoMensaje}</div>
              <button type="button" className="btn btn-sm btn-outline-success mt-2" onClick={onCerrar}>
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-3 p-3 mb-3" style={{ backgroundColor: 'var(--hotel-color-fondo)' }}>
                <div className="small fw-semibold mb-2">Fechas actuales</div>
                <div className="d-flex justify-content-between small mb-1">
                  <span>Check-in actual</span>
                  <strong>{reserva.fecha_entrada}</strong>
                </div>
                <div className="d-flex justify-content-between small mb-1">
                  <span>Check-out actual</span>
                  <strong>{reserva.fecha_salida}</strong>
                </div>
                <div className="d-flex justify-content-between small">
                  <span>Precio actual</span>
                  <strong>{formatearMoneda(reserva.precio_total)}</strong>
                </div>
              </div>

              <form className="row g-2 mb-3" onSubmit={cotizarCambio}>
                <div className="col-12 col-md-5">
                  <label className="form-label mb-0" htmlFor="mod_fecha_entrada">
                    Nueva fecha de entrada
                  </label>
                  <input
                    id="mod_fecha_entrada"
                    type="date"
                    className="form-control"
                    value={fechaEntrada}
                    onChange={(e) => { setFechaEntrada(e.target.value); setCotizacion(null) }}
                    required
                  />
                </div>
                <div className="col-12 col-md-5">
                  <label className="form-label mb-0" htmlFor="mod_fecha_salida">
                    Nueva fecha de salida
                  </label>
                  <input
                    id="mod_fecha_salida"
                    type="date"
                    className="form-control"
                    value={fechaSalida}
                    onChange={(e) => { setFechaSalida(e.target.value); setCotizacion(null) }}
                    required
                  />
                </div>
                <div className="col-12 col-md-2 d-grid align-self-end">
                  <button type="submit" className="btn btn-outline-primary" disabled={cargandoCotizacion}>
                    {cargandoCotizacion ? '...' : 'Cotizar'}
                  </button>
                </div>
              </form>

              {cotizacion ? (
                <>
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <div className="rounded-3 p-3 h-100" style={{ backgroundColor: 'var(--hotel-color-fondo)' }}>
                        <div className="small fw-semibold mb-2">Precio Original</div>
                        <div className="h5 mb-1">{formatearMoneda(cotizacion.precio_original)}</div>
                        <div className="small text-secondary">
                          {cotizacion.fecha_entrada_original} a {cotizacion.fecha_salida_original}
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="rounded-3 p-3 h-100" style={{ backgroundColor: 'var(--hotel-color-secundario)' }}>
                        <div className="small fw-semibold mb-2">Precio Nuevo</div>
                        <div className="h5 mb-1">{formatearMoneda(cotizacion.precio_nuevo)}</div>
                        <div className="small text-secondary">
                          {cotizacion.fecha_entrada_nueva} a {cotizacion.fecha_salida_nueva}
                        </div>
                      </div>
                    </div>
                  </div>

                  {renderSaldoFinal()}

                  {cotizacion.desglose_nuevo && cotizacion.desglose_nuevo.length > 0 ? (
                    <DesglosePrecio
                      detallesNoches={cotizacion.desglose_nuevo}
                      totalFinal={cotizacion.precio_nuevo}
                      cargando={false}
                    />
                  ) : null}

                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={confirmando}
                      onClick={confirmarModificacion}
                    >
                      {confirmando ? 'Confirmando...' : 'Aceptar nuevo precio'}
                    </button>
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
