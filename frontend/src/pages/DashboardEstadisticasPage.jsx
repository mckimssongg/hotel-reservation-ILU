import { useState, useEffect, useRef } from 'react'
import { Tooltip } from 'bootstrap'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'

import { useAuth } from '../hooks/useAuth'
import { obtenerEstadisticasDashboardApi } from '../services/hotelApi'
import { formatearMoneda, obtenerFechaISO, obtenerMensajeError } from '../utils/hotelHelpers'

const COLORES_GRAFICA = ['#2C5F2D', '#4B5563', '#97C29D', '#6B8E6B', '#A3C9A3']

function obtenerInicioMes() {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  return `${anio}-${mes}-01`
}

export default function DashboardEstadisticasPage() {
  const { ejecutarConAuth } = useAuth()

  const [fechaInicio, setFechaInicio] = useState(obtenerInicioMes)
  const [fechaFin, setFechaFin] = useState(() => obtenerFechaISO(0))
  const [estadisticas, setEstadisticas] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function manejarFiltrar() {
    if (!fechaInicio || !fechaFin) {
      setError('Selecciona ambas fechas.')
      return
    }

    setError('')
    setCargando(true)

    try {
      const queryParams = `fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`
      const { response, data } = await ejecutarConAuth(
        (token) => obtenerEstadisticasDashboardApi(queryParams, token)
      )

      if (!response.ok) {
        setError(obtenerMensajeError(data, 'No se pudieron obtener las estadisticas.'))
        setEstadisticas(null)
        return
      }

      setEstadisticas(data)
    } catch {
      setError('Error de conexion al obtener estadisticas.')
      setEstadisticas(null)
    } finally {
      setCargando(false)
    }
  }

  const tasaOcupacion = estadisticas?.ocupacion?.general?.tasa
    ? (Number(estadisticas.ocupacion.general.tasa) * 100).toFixed(1)
    : null

  const datosPorTipo = estadisticas?.ocupacion?.por_tipo?.map((item) => ({
    nombre: item.tipo,
    ocupacion: Number((Number(item.tasa) * 100).toFixed(1)),
    noches: item.noches_ocupadas,
  })) || []

  const hayDatos = estadisticas && (
    Number(estadisticas.ingresos?.proyectado || 0) > 0 ||
    estadisticas.ocupacion?.general?.noches_ocupadas > 0
  )

  return (
    <div>
      <h2 className="h4 mb-3">Estadísticas del Hotel</h2>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-4">
              <label htmlFor="filtro-fecha-inicio" className="form-label small fw-semibold">Fecha inicio</label>
              <input
                id="filtro-fecha-inicio"
                type="date"
                className="form-control"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="col-12 col-sm-4">
              <label htmlFor="filtro-fecha-fin" className="form-label small fw-semibold">Fecha fin</label>
              <input
                id="filtro-fecha-fin"
                type="date"
                className="form-control"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <div className="col-12 col-sm-4">
              <button
                type="button"
                className="btn btn-hotel-primary w-100"
                onClick={manejarFiltrar}
                disabled={cargando}
              >
                {cargando ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-funnel me-1" />
                    Filtrar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger rounded-4" role="alert">
          <i className="bi bi-exclamation-triangle me-2" />
          {error}
        </div>
      )}

      {cargando && !estadisticas && (
        <div className="text-center py-5">
          <div className="spinner-border" role="status" style={{ color: 'var(--hotel-color-primario)' }}>
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="text-secondary mt-2">Calculando estadísticas...</p>
        </div>
      )}

      {!cargando && estadisticas && !hayDatos && (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <i className="bi bi-calendar-x display-4 text-secondary mb-3 d-block" />
            <h5>No hay reservaciones en este rango de fechas</h5>
            <p className="text-secondary mb-0">Prueba con un rango diferente para ver estadísticas.</p>
          </div>
        </div>
      )}

      {estadisticas && hayDatos && (
        <>
          <div className="row g-3 mb-4">
            <TarjetaKPI
              icono="bi-cash-stack"
              titulo="Ingresos Proyectados"
              valor={formatearMoneda(estadisticas.ingresos.proyectado)}
              subtexto={`Real: ${formatearMoneda(estadisticas.ingresos.real)}`}
            />
            <TarjetaKPI
              icono="bi-pie-chart"
              titulo="Ocupación General"
              valor={`${tasaOcupacion}%`}
              subtexto={`${estadisticas.ocupacion.general.noches_ocupadas} de ${estadisticas.ocupacion.general.noches_posibles} noches`}
            />
            <TarjetaKPI
              icono="bi-arrow-up-circle"
              titulo="Más Demandada"
              valor={estadisticas.demanda.mayor?.numero || '-'}
              subtexto={`${estadisticas.demanda.mayor?.total_reservas || 0} reservas`}
            />
            <TarjetaKPI
              icono="bi-arrow-down-circle"
              titulo="Menos Demandada"
              valor={estadisticas.demanda.menor?.numero || '-'}
              subtexto={`${estadisticas.demanda.menor?.total_reservas || 0} reservas`}
            />
          </div>

          {datosPorTipo.length > 0 && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  <i className="bi bi-bar-chart me-2" />
                  Ocupación por Tipo de Habitación
                </h5>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={datosPorTipo} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="nombre" tick={{ fill: '#4B5563', fontSize: 13 }} />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fill: '#4B5563', fontSize: 13 }} />
                    <RechartsTooltip
                      formatter={(valor, _nombre, props) => [`${valor}% (${props.payload.noches} noches)`, 'Ocupación']}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="ocupacion" radius={[8, 8, 0, 0]} maxBarSize={60}>
                      {datosPorTipo.map((_item, index) => (
                        <Cell key={index} fill={COLORES_GRAFICA[index % COLORES_GRAFICA.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {!cargando && !estadisticas && !error && (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center py-5">
            <i className="bi bi-graph-up display-4 mb-3 d-block" style={{ color: 'var(--hotel-color-primario)' }} />
            <h5>Selecciona un rango de fechas</h5>
            <p className="text-secondary mb-0">Elige las fechas y presiona "Filtrar" para ver las estadísticas.</p>
          </div>
        </div>
      )}
    </div>
  )
}

const TOOLTIPS_KPI = {
  'Ingresos Proyectados': 'Todo el dinero que ingresará si nadie cancela las reservas actuales.',
  'Ingresos Reales': 'El dinero que ya cobramos porque las personas ya llegaron o se fueron.',
  'Ocupación General': 'Porcentaje de noches vendidas vs el total de noches disponibles en el mes.',
  'Más Demandada': 'La habitación que más personas quieren y prefieren reservar.',
  'Menos Demandada': 'La habitación que casi nadie ha querido reservar en este mes.',
}

function TarjetaKPI({ icono, titulo, valor, subtexto }) {
  const infoTexto = TOOLTIPS_KPI[titulo] || ''
  const tooltipRef = useRef(null)

  useEffect(() => {
    let bsTooltip = null
    if (tooltipRef.current && infoTexto) {
      bsTooltip = new Tooltip(tooltipRef.current, {
        title: infoTexto,
        placement: 'top',
        trigger: 'hover'
      })
    }
    return () => {
      if (bsTooltip) bsTooltip.dispose()
    }
  }, [infoTexto])

  return (
    <div className="col-6 col-lg-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span
              className="rounded-3 d-inline-flex align-items-center justify-content-center"
              style={{ width: 36, height: 36, backgroundColor: 'var(--hotel-color-secundario)' }}
            >
              <i className={`bi ${icono}`} style={{ color: 'var(--hotel-color-primario)' }} />
            </span>
            <span className="small text-secondary">{titulo}</span>
            {infoTexto && (
              <i
                ref={tooltipRef}
                className="bi bi-info-circle text-secondary"
                data-bs-toggle="tooltip"
                style={{ cursor: 'help', fontSize: '0.85rem' }}
              />
            )}
          </div>
          <div className="h4 mb-1">{valor}</div>
          <small className="text-secondary">{subtexto}</small>
        </div>
      </div>
    </div>
  )
}
