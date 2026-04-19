import { useState } from 'react'

import RoomCard from './RoomCard'
import FormularioListaEspera from './FormularioListaEspera'
import MonitorListaEspera from './MonitorListaEspera'

export default function RoomGrid({ habitaciones, resumen, busquedaRealizada, cargandoBusqueda, errorBusqueda, onReservar, filtrosBusqueda }) {
  const [mostrarWaitlist, setMostrarWaitlist] = useState(false)
  const [entradaId, setEntradaId] = useState(null)

  const totalHabitaciones = resumen?.count || habitaciones.length || 0

  function iniciarWaitlist() {
    setMostrarWaitlist(true)
  }

  function reiniciarWaitlist() {
    setMostrarWaitlist(false)
    setEntradaId(null)
  }

  const datosIniciales = {
    fecha_entrada_preferida: filtrosBusqueda?.fecha_entrada || '',
    fecha_salida_preferida: filtrosBusqueda?.fecha_salida || '',
    cantidad_huespedes: Number(filtrosBusqueda?.cantidad_huespedes) || 1,
  }

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">{busquedaRealizada ? `${totalHabitaciones} habitaciones disponibles` : 'Habitaciones destacadas'}</h2>
      </div>

      {errorBusqueda ? <div className="alert alert-danger rounded-4 shadow-sm">{errorBusqueda}</div> : null}

      {cargandoBusqueda ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body py-5 text-center text-secondary">Cargando habitaciones...</div>
        </div>
      ) : null}

      {!cargandoBusqueda && busquedaRealizada && habitaciones.length === 0 && !mostrarWaitlist ? (
        <div className="card border-0 shadow-sm rounded-4" style={{ backgroundColor: '#E9F5EC' }}>
          <div className="card-body py-5 text-center">
            <i className="bi bi-calendar-x display-4 d-block mb-3" style={{ color: '#2C5F2D' }} />
            <h5>No hay disponibilidad para estas fechas</h5>
            <p className="text-secondary mb-3">
              ¿Deseas unirte a la lista de espera? Te avisaremos en tiempo real si se libera una habitación compatible.
            </p>
            <button
              type="button"
              className="btn btn-hotel-primary px-4 py-2"
              onClick={iniciarWaitlist}
            >
              <i className="bi bi-bell me-2" />
              Inscribirme en lista de espera
            </button>
          </div>
        </div>
      ) : null}

      {mostrarWaitlist && !entradaId ? (
        <div className="mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="h5 mb-0">Unirse a la Lista de Espera</h4>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={reiniciarWaitlist}>Cancelar</button>
          </div>
          <FormularioListaEspera datosIniciales={datosIniciales} onEntradaCreada={(id) => setEntradaId(id)} />
        </div>
      ) : null}

      {mostrarWaitlist && entradaId ? (
        <div className="mt-4">
          <MonitorListaEspera entradaId={entradaId} onReiniciar={reiniciarWaitlist} />
        </div>
      ) : null}

      {!cargandoBusqueda && habitaciones.length > 0 ? (
        <div className="row g-3 g-md-4">
          {habitaciones.map((habitacion) => (
            <div key={habitacion.id} className="col-12 col-md-6 col-xl-4">
              <RoomCard habitacion={habitacion} onReservar={onReservar} />
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
