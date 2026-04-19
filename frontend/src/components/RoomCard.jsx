import { formatearMoneda } from '../utils/hotelHelpers'

export default function RoomCard({ habitacion, onReservar }) {
  const tipo = habitacion?.tipo_habitacion
  const precioTotal = formatearMoneda(habitacion?.precio_total_estimado || 0)
  const precioBase = formatearMoneda(tipo?.precio_base || 0)

  return (
    <article className="card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body d-flex flex-column gap-3">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h3 className="h5 mb-1">Habitacion {habitacion.numero}</h3>
            <p className="mb-0 text-secondary">Piso {habitacion.piso}</p>
          </div>
          <span className="badge rounded-pill text-dark" style={{ backgroundColor: 'var(--hotel-color-secundario)' }}>
            {tipo?.nombre || 'Tipo'}
          </span>
        </div>

        <div>
          <div className="small text-secondary">Capacidad</div>
          <strong>Hasta {tipo?.capacidad || 1} huespedes</strong>
        </div>

        <div className="rounded-3 p-3" style={{ backgroundColor: 'var(--hotel-color-fondo)' }}>
          <div className="d-flex justify-content-between small">
            <span className="text-secondary">Base por noche</span>
            <span>{precioBase}</span>
          </div>
          <div className="d-flex justify-content-between align-items-end mt-1">
            <span className="fw-semibold">Total ({habitacion.cantidad_noches || 0} noches)</span>
            <span className="h5 mb-0">{precioTotal}</span>
          </div>
        </div>

        <div className="mt-auto d-grid">
          <button type="button" className="btn btn-hotel-primary" onClick={() => onReservar(habitacion)}>
            Reservar
          </button>
        </div>
      </div>
    </article>
  )
}
