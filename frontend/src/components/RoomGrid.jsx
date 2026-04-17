import RoomCard from './RoomCard'

export default function RoomGrid({ habitaciones, resumen, busquedaRealizada, cargandoBusqueda, errorBusqueda, onReservar, onListaEspera }) {
  const totalHabitaciones = resumen?.count || 0

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">{busquedaRealizada ? `${totalHabitaciones} habitaciones disponibles` : 'Habitaciones destacadas'}</h2>
        {/* {busquedaRealizada ? <span className="badge rounded-pill text-bg-light border">Resultados en vivo</span> : null} */}
      </div>

      {errorBusqueda ? <div className="alert alert-danger rounded-4 shadow-sm">{errorBusqueda}</div> : null}

      {cargandoBusqueda ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body py-5 text-center text-secondary">Cargando habitaciones...</div>
        </div>
      ) : null}

      {!cargandoBusqueda && busquedaRealizada && habitaciones.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body py-5 text-center text-secondary">
            No encontramos opciones para esas fechas. Ajusta filtros o intenta con otro rango.
          </div>
        </div>
      ) : null}

      {!cargandoBusqueda && habitaciones.length > 0 ? (
        <div className="row g-3 g-md-4">
          {habitaciones.map((habitacion) => (
            <div key={habitacion.id} className="col-12 col-md-6 col-xl-4">
              <RoomCard habitacion={habitacion} onReservar={onReservar} onListaEspera={onListaEspera} />
            </div>
          ))}
        </div>
      ) : null}

      {!cargandoBusqueda && !busquedaRealizada ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body py-5 text-center text-secondary">
            Completa tus fechas para ver disponibilidad real del hotel.
          </div>
        </div>
      ) : null}
    </section>
  )
}
