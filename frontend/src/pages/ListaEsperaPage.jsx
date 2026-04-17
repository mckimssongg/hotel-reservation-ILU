export default function ListaEsperaPage() {
  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-body">
        <h2 className="h4">Lista de Espera</h2>
        {/* <p className="text-secondary">Esta vista esta lista para conectarse cuando el backend exponga los endpoints de lista de espera.</p> */}
        <p className="text-secondary">Al rato sale.</p>


        <div className="rounded-4 p-4" style={{ backgroundColor: 'var(--hotel-color-fondo)' }}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h3 className="h6 mb-1">Modulo Proximamente</h3>
              {/* <p className="mb-0 text-secondary small">Podras gestionar solicitudes de espera y notificaciones desde aqui.</p> */}
              <p className="mb-0 text-secondary small">Al rato sale x2.</p>
            </div>
            <button type="button" className="btn btn-primary" disabled>
              Crear solicitud
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
