import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import HeroSearch from '../components/HeroSearch'
import Navbar from '../components/Navbar'
import ReservationModal from '../components/ReservationModal'
import RoomGrid from '../components/RoomGrid'
import ToastConflicto from '../components/ToastConflicto'
import { filtrosDisponibilidadIniciales } from '../constants/appConstants'
import { useAuth } from '../hooks/useAuth'
import { obtenerDisponibilidad, obtenerTiposHabitacion } from '../services/hotelApi'
import { extraerPagina, obtenerFechaISO, obtenerMensajeError, validarRangoFechas } from '../utils/hotelHelpers'

export default function PublicHomePage() {
  const { isAuthenticated, abrirModalAuth } = useAuth()

  const [filtros, setFiltros] = useState(() => ({
    ...filtrosDisponibilidadIniciales,
    fecha_entrada: obtenerFechaISO(1),
    fecha_salida: obtenerFechaISO(3),
  }))
  const [tiposHabitacion, setTiposHabitacion] = useState([])
  const [habitaciones, setHabitaciones] = useState([])
  const [resumen, setResumen] = useState({
    count: 0,
    paginaActual: 1,
    paginaSiguiente: null,
    paginaAnterior: null,
  })
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState('')
  const [busquedaRealizada, setBusquedaRealizada] = useState(false)

  const [modalReservaAbierto, setModalReservaAbierto] = useState(false)
  const [habitacionSeleccionada, setHabitacionSeleccionada] = useState(null)
  const [mensajeAccion, setMensajeAccion] = useState('')

  const [toastConflicto, setToastConflicto] = useState({ visible: false, mensaje: '' })

  useEffect(() => {
    cargarTiposHabitacion()
  }, [])

  async function cargarTiposHabitacion() {
    try {
      const { data } = await obtenerTiposHabitacion()
      const lista = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      setTiposHabitacion(lista)
    } catch {
      setTiposHabitacion([])
    }
  }

  function actualizarFiltro(event) {
    const { name, value } = event.target
    if (name === 'cantidad_huespedes') {
      setFiltros((anterior) => ({ ...anterior, [name]: Number(value || 1) }))
      return
    }

    setFiltros((anterior) => ({ ...anterior, [name]: value }))
  }

  async function consultarDisponibilidad(pagina = 1) {
    setCargandoBusqueda(true)
    setErrorBusqueda('')

    try {
      const params = new URLSearchParams({
        fecha_entrada: filtros.fecha_entrada,
        fecha_salida: filtros.fecha_salida,
        cantidad_huespedes: String(filtros.cantidad_huespedes || 1),
        page: String(pagina),
      })

      if (filtros.tipo_habitacion) {
        params.append('tipo_habitacion', filtros.tipo_habitacion)
      }

      const { response, data } = await obtenerDisponibilidad(params.toString())
      if (!response.ok) {
        setErrorBusqueda(obtenerMensajeError(data, 'No se pudo consultar disponibilidad.'))
        setHabitaciones([])
        setResumen({ count: 0, paginaActual: 1, paginaSiguiente: null, paginaAnterior: null })
        setBusquedaRealizada(true)
        return
      }

      const lista = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      setHabitaciones(lista)
      setResumen({
        count: data?.count || lista.length,
        paginaActual: pagina,
        paginaSiguiente: extraerPagina(data?.next),
        paginaAnterior: extraerPagina(data?.previous),
      })
      setBusquedaRealizada(true)
    } catch {
      setErrorBusqueda('No se pudo conectar con el backend para buscar habitaciones.')
      setHabitaciones([])
      setResumen({ count: 0, paginaActual: 1, paginaSiguiente: null, paginaAnterior: null })
      setBusquedaRealizada(true)
    } finally {
      setCargandoBusqueda(false)
    }
  }

  async function buscar(event) {
    event.preventDefault()
    setMensajeAccion('')

    const errorFechas = validarRangoFechas(filtros.fecha_entrada, filtros.fecha_salida)
    if (errorFechas) {
      setErrorBusqueda(errorFechas)
      setBusquedaRealizada(true)
      return
    }

    if (Number(filtros.cantidad_huespedes) < 1) {
      setErrorBusqueda('La cantidad de huespedes debe ser al menos 1.')
      setBusquedaRealizada(true)
      return
    }

    await consultarDisponibilidad(1)
  }

  function iniciarFlujoReserva(habitacion) {
    setMensajeAccion('')

    if (!isAuthenticated) {
      abrirModalAuth('login')
      return
    }

    const errorFechas = validarRangoFechas(filtros.fecha_entrada, filtros.fecha_salida)
    if (errorFechas) {
      setErrorBusqueda(errorFechas)
      return
    }

    setHabitacionSeleccionada(habitacion)
    setModalReservaAbierto(true)
  }


  function cerrarModalReserva() {
    setModalReservaAbierto(false)
  }

  const manejarConflicto = useCallback((mensaje) => {
    setToastConflicto({ visible: true, mensaje })
    consultarDisponibilidad(resumen.paginaActual || 1)
  }, [resumen.paginaActual])

  async function manejarReservaCreada() {
    setMensajeAccion('Tu reservacion fue confirmada correctamente.')
    setModalReservaAbierto(false)
    await consultarDisponibilidad(resumen.paginaActual || 1)
  }

  return (
    <>
      <Navbar />

      <main className="container py-4">
        <HeroSearch
          filtros={filtros}
          tiposHabitacion={tiposHabitacion}
          cargandoBusqueda={cargandoBusqueda}
          onActualizarFiltro={actualizarFiltro}
          onBuscar={buscar}
        />

        {mensajeAccion ? (
          <div className="alert alert-success mt-3 mb-4 rounded-4 shadow-sm d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3" style={{ backgroundColor: 'var(--hotel-color-secundario)', borderColor: 'var(--hotel-color-primario)', color: 'var(--hotel-color-texto)' }}>
            <span className="fw-medium"><i className="bi bi-check-circle-fill me-2" style={{ color: 'var(--hotel-color-primario)' }} />{mensajeAccion}</span>
            <Link to="/dashboard/mis-reservaciones" className="btn btn-hotel-primary btn-sm px-4 rounded-pill shadow-sm">
              Ver mis reservaciones
            </Link>
          </div>
        ) : null}

        <RoomGrid
          habitaciones={habitaciones}
          resumen={resumen}
          busquedaRealizada={busquedaRealizada}
          cargandoBusqueda={cargandoBusqueda}
          errorBusqueda={errorBusqueda}
          onReservar={iniciarFlujoReserva}
          filtrosBusqueda={filtros}
        />

        {(resumen.paginaAnterior || resumen.paginaSiguiente) && !cargandoBusqueda ? (
          <div className="d-flex justify-content-end gap-2 mt-3">
            <button
              type="button"
              className="btn btn-outline-hotel-primary"
              disabled={!resumen.paginaAnterior}
              onClick={() => consultarDisponibilidad(resumen.paginaAnterior)}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn btn-outline-hotel-primary"
              disabled={!resumen.paginaSiguiente}
              onClick={() => consultarDisponibilidad(resumen.paginaSiguiente)}
            >
              Siguiente
            </button>
          </div>
        ) : null}
      </main>

      <ReservationModal
        abierto={modalReservaAbierto}
        habitacion={habitacionSeleccionada}
        filtrosBusqueda={filtros}
        onCerrar={cerrarModalReserva}
        onReservaCreada={manejarReservaCreada}
        onConflicto={manejarConflicto}
      />

      <ToastConflicto
        visible={toastConflicto.visible}
        mensaje={toastConflicto.mensaje}
        onCerrar={() => setToastConflicto({ visible: false, mensaje: '' })}
      />
    </>
  )
}
