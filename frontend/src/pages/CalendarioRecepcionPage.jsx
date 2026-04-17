import { useEffect, useState } from 'react'

import CalendarioRecepcion from '../components/CalendarioRecepcion'
import { obtenerCalendarioMensualApi, obtenerTiposHabitacion } from '../services/hotelApi'
import { obtenerMensajeError } from '../utils/hotelHelpers'

function obtenerMesAnioActual() {
  const hoy = new Date()
  return { mes: hoy.getMonth() + 1, anio: hoy.getFullYear() }
}

export default function CalendarioRecepcionPage() {
  const [mesAnio, setMesAnio] = useState(() => obtenerMesAnioActual())
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [tiposHabitacion, setTiposHabitacion] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroPiso, setFiltroPiso] = useState('')

  useEffect(() => {
    cargarTiposHabitacion()
  }, [])

  useEffect(() => {
    cargarCalendario()
  }, [mesAnio.mes, mesAnio.anio, filtroTipo, filtroPiso])

  async function cargarTiposHabitacion() {
    try {
      const { data } = await obtenerTiposHabitacion()
      const lista = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      setTiposHabitacion(lista)
    } catch {
      setTiposHabitacion([])
    }
  }

  async function cargarCalendario() {
    setCargando(true)
    setError('')

    try {
      const params = new URLSearchParams({
        mes: String(mesAnio.mes),
        anio: String(mesAnio.anio),
      })

      if (filtroTipo) {
        params.append('tipo_habitacion', filtroTipo)
      }
      if (filtroPiso) {
        params.append('piso', filtroPiso)
      }

      const { response, data } = await obtenerCalendarioMensualApi(params.toString())
      if (!response.ok) {
        setError(obtenerMensajeError(data, 'No se pudo cargar el calendario.'))
        setDatos(null)
        return
      }

      setDatos(data)
    } catch {
      setError('No se pudo conectar con el backend para cargar el calendario.')
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }

  function irMesAnterior() {
    setMesAnio((anterior) => {
      if (anterior.mes === 1) {
        return { mes: 12, anio: anterior.anio - 1 }
      }
      return { mes: anterior.mes - 1, anio: anterior.anio }
    })
  }

  function irMesSiguiente() {
    setMesAnio((anterior) => {
      if (anterior.mes === 12) {
        return { mes: 1, anio: anterior.anio + 1 }
      }
      return { mes: anterior.mes + 1, anio: anterior.anio }
    })
  }

  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-body">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
          <h2 className="h4 mb-0">
            <i className="bi bi-calendar3 me-2" />
            Calendario de Disponibilidad
          </h2>
          <div className="d-flex gap-2 flex-wrap">
            <select
              className="form-select form-select-sm"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{ minWidth: 130 }}
            >
              <option value="">Todos los tipos</option>
              {tiposHabitacion.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
              ))}
            </select>
            <select
              className="form-select form-select-sm"
              value={filtroPiso}
              onChange={(e) => setFiltroPiso(e.target.value)}
              style={{ minWidth: 100 }}
            >
              <option value="">Todos los pisos</option>
              <option value="1">Piso 1</option>
              <option value="2">Piso 2</option>
              <option value="3">Piso 3</option>
            </select>
          </div>
        </div>

        <CalendarioRecepcion
          datos={datos}
          mes={mesAnio.mes}
          anio={mesAnio.anio}
          cargando={cargando}
          error={error}
          onMesAnterior={irMesAnterior}
          onMesSiguiente={irMesSiguiente}
        />
      </div>
    </div>
  )
}
