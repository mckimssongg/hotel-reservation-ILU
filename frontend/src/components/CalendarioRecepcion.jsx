import { useState } from 'react'

const NOMBRES_MES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const NOMBRES_DIA_SEMANA = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

function obtenerClaseCelda(estado) {
  const clases = {
    'libre': 'celda-libre',
    'reservada': 'celda-reservada',
    'check-in_hoy': 'celda-checkin',
    'check-out_hoy': 'celda-checkout',
    'transicion': 'celda-transicion',
  }
  return clases[estado] || 'celda-libre'
}

function obtenerDiaSemana(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00`)
  return fecha.getDay()
}

function esFinDeSemana(fechaISO) {
  const dia = obtenerDiaSemana(fechaISO)
  return dia === 0 || dia === 6
}

export default function CalendarioRecepcion({ datos, mes, anio, cargando, error, onMesAnterior, onMesSiguiente }) {
  const [detalleReserva, setDetalleReserva] = useState(null)

  if (cargando) {
    return (
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body py-5 text-center text-secondary">Cargando calendario...</div>
      </div>
    )
  }

  if (error) {
    return <div className="alert alert-danger rounded-4">{error}</div>
  }

  if (!datos || !datos.habitaciones) {
    return (
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body py-5 text-center text-secondary">Sin datos de calendario.</div>
      </div>
    )
  }

  const diasMes = datos.dias || []
  const habitaciones = datos.habitaciones || []

  function manejarClickCelda(celda) {
    if (celda.estado === 'libre' || !celda.reservas || celda.reservas.length === 0) {
      setDetalleReserva(null)
      return
    }
    setDetalleReserva({
      dia: celda.dia,
      fecha: celda.fecha,
      estado: celda.estado,
      reservas: celda.reservas,
    })
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onMesAnterior}>
          <i className="bi bi-chevron-left me-1" />
          Anterior
        </button>
        <h5 className="mb-0">{NOMBRES_MES[mes]} {anio}</h5>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onMesSiguiente}>
          Siguiente
          <i className="bi bi-chevron-right ms-1" />
        </button>
      </div>

      <div className="d-flex flex-wrap gap-3 mb-3 small">
        <span><span className="d-inline-block rounded-1 me-1" style={{ width: 14, height: 14, backgroundColor: '#ffffff', border: '1px solid #dee2e6' }} /> Libre</span>
        <span><span className="d-inline-block rounded-1 me-1" style={{ width: 14, height: 14, backgroundColor: '#fde68a' }} /> Reservada</span>
        <span><span className="d-inline-block rounded-1 me-1" style={{ width: 14, height: 14, backgroundColor: '#bbf7d0' }} /> Check-in</span>
        <span><span className="d-inline-block rounded-1 me-1" style={{ width: 14, height: 14, backgroundColor: '#fecaca' }} /> Check-out</span>
        <span><span className="d-inline-block rounded-1 me-1" style={{ width: 14, height: 14, background: 'linear-gradient(135deg, #fecaca 50%, #bbf7d0 50%)' }} /> Transicion</span>
      </div>

      <div className="table-responsive">
        <table className="calendario-grilla">
          <thead>
            <tr>
              <th className="habitacion-label">Habitacion</th>
              {diasMes.map((fechaISO) => {
                const diaSemana = obtenerDiaSemana(fechaISO)
                const dia = new Date(`${fechaISO}T00:00:00`).getDate()
                const claseFds = esFinDeSemana(fechaISO) ? 'dia-fin-semana' : ''
                return (
                  <th key={fechaISO} className={claseFds} title={fechaISO}>
                    <div>{NOMBRES_DIA_SEMANA[diaSemana]}</div>
                    <div>{dia}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {habitaciones.map((habitacion) => (
              <tr key={habitacion.id}>
                <td className="habitacion-label">
                  <div>{habitacion.numero}</div>
                  <div className="text-secondary" style={{ fontSize: '0.7rem' }}>{habitacion.tipo_habitacion?.nombre}</div>
                </td>
                {habitacion.celdas.map((celda) => {
                  const claseCelda = obtenerClaseCelda(celda.estado)
                  const claseFds = esFinDeSemana(celda.fecha) && celda.estado === 'libre' ? 'dia-fin-semana' : ''
                  const titulo = celda.estado !== 'libre' && celda.reservas?.length > 0
                    ? celda.reservas.map((r) => `${r.nombre_huesped} (${r.codigo_reserva})`).join(', ')
                    : ''
                  return (
                    <td
                      key={celda.fecha}
                      className={`${claseCelda} ${claseFds}`}
                      title={titulo}
                      onClick={() => manejarClickCelda(celda)}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detalleReserva ? (
        <div className="card border-0 shadow-sm rounded-4 mt-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h6 className="mb-0">
                <i className="bi bi-info-circle me-1" />
                Detalle - Dia {detalleReserva.dia} ({detalleReserva.estado.replace(/_/g, ' ')})
              </h6>
              <button type="button" className="btn-close btn-sm" onClick={() => setDetalleReserva(null)} aria-label="Cerrar" />
            </div>
            <div className="table-responsive">
              <table className="table table-sm table-bordered mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Codigo</th>
                    <th>Huesped</th>
                    <th>Estado</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                  </tr>
                </thead>
                <tbody>
                  {detalleReserva.reservas.map((reserva) => (
                    <tr key={reserva.id}>
                      <td className="small">{reserva.codigo_reserva}</td>
                      <td className="small">{reserva.nombre_huesped}</td>
                      <td className="small">{reserva.estado}</td>
                      <td className="small">{reserva.fecha_entrada}</td>
                      <td className="small">{reserva.fecha_salida}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
