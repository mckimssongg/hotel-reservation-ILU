export default function HeroSearch({ filtros, tiposHabitacion, cargandoBusqueda, onActualizarFiltro, onBuscar }) {
  return (
    <section className="rounded-4 shadow-sm p-3 p-md-4 mb-4" style={{ backgroundColor: 'var(--hotel-color-secundario)' }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-2">
        <div>
          <h1 className="h3 mb-1">Buscar Habitaciones</h1>
          <p className="mb-0 text-secondary">Encuentra la habitacion ideal para tus fechas</p>
        </div>
      </div>

      <form className="row g-2 g-md-3 align-items-end" onSubmit={onBuscar}>
        <div className="col-12 col-md-3">
          <label className="form-label mb-1" htmlFor="hero_fecha_entrada">
            Check-in
          </label>
          <input
            id="hero_fecha_entrada"
            name="fecha_entrada"
            type="date"
            className="form-control"
            value={filtros.fecha_entrada}
            onChange={onActualizarFiltro}
            required
          />
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label mb-1" htmlFor="hero_fecha_salida">
            Check-out
          </label>
          <input
            id="hero_fecha_salida"
            name="fecha_salida"
            type="date"
            className="form-control"
            value={filtros.fecha_salida}
            onChange={onActualizarFiltro}
            required
          />
        </div>

        <div className="col-12 col-md-2">
          <label className="form-label mb-1" htmlFor="hero_cantidad_huespedes">
            Huespedes
          </label>
          <input
            id="hero_cantidad_huespedes"
            name="cantidad_huespedes"
            type="number"
            min="1"
            className="form-control"
            value={filtros.cantidad_huespedes}
            onChange={onActualizarFiltro}
            required
          />
        </div>

        <div className="col-12 col-md-2">
          <label className="form-label mb-1" htmlFor="hero_tipo_habitacion">
            Tipo
          </label>
          <select
            id="hero_tipo_habitacion"
            name="tipo_habitacion"
            className="form-select"
            value={filtros.tipo_habitacion}
            onChange={onActualizarFiltro}
          >
            <option value="">Todos</option>
            {tiposHabitacion.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-2 d-grid">
          <button type="submit" className="btn btn-primary" disabled={cargandoBusqueda}>
            <i className="bi bi-search me-2" />
            {cargandoBusqueda ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </form>
    </section>
  )
}
