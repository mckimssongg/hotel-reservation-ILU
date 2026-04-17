import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

import { AUTH_STORAGE_KEY } from '../constants/appConstants'
import {
  cerrarSesionUsuarioApi,
  iniciarSesionUsuarioApi,
  obtenerMiPerfilApi,
  refrescarTokenUsuarioApi,
  registrarUsuarioApi,
} from '../services/hotelApi'
import { ejecutarConViewTransition, obtenerMensajeError } from '../utils/hotelHelpers'

export const AuthContext = createContext(null)

function cargarSesionLocal() {
  try {
    const data = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!data) {
      return { access: '', refresh: '', usuario: null }
    }

    const sesion = JSON.parse(data)
    return {
      access: sesion?.access || '',
      refresh: sesion?.refresh || '',
      usuario: sesion?.usuario || null,
    }
  } catch {
    return { access: '', refresh: '', usuario: null }
  }
}

function extraerTokensAuth(data) {
  return {
    access: data?.access || data?.tokens?.access || '',
    refresh: data?.refresh || data?.tokens?.refresh || '',
    usuario: data?.usuario || null,
  }
}

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(() => cargarSesionLocal())
  const [modalAuth, setModalAuth] = useState({ abierto: false, modo: 'login' })
  const [cargandoAuth, setCargandoAuth] = useState(false)
  const [errorAuth, setErrorAuth] = useState('')

  useEffect(() => {
    if (!sesion.access || !sesion.refresh) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sesion))
  }, [sesion])

  const cerrarSesionLocal = useCallback(() => {
    setSesion({ access: '', refresh: '', usuario: null })
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  const obtenerPerfilActual = useCallback(async (accessToken) => {
    if (!accessToken) {
      return null
    }

    const { response, data } = await obtenerMiPerfilApi(accessToken)
    if (!response.ok || !data) {
      return null
    }

    return data
  }, [])

  useEffect(() => {
    if (!sesion.access || sesion.usuario) {
      return
    }

    let cancelar = false

    async function cargarPerfil() {
      const perfil = await obtenerPerfilActual(sesion.access)
      if (!cancelar && perfil) {
        setSesion((anterior) => ({ ...anterior, usuario: perfil }))
      }
    }

    cargarPerfil()

    return () => {
      cancelar = true
    }
  }, [obtenerPerfilActual, sesion.access, sesion.usuario])

  const abrirModalAuth = useCallback((modo = 'login') => {
    setErrorAuth('')
    ejecutarConViewTransition(() => {
      setModalAuth({ abierto: true, modo })
    })
  }, [])

  const cerrarModalAuth = useCallback(() => {
    setErrorAuth('')
    ejecutarConViewTransition(() => {
      setModalAuth((anterior) => ({ ...anterior, abierto: false }))
    })
  }, [])

  const cambiarModoAuth = useCallback((modo) => {
    setErrorAuth('')
    setModalAuth((anterior) => ({ ...anterior, modo }))
  }, [])

  const refrescarAcceso = useCallback(async () => {
    if (!sesion.refresh) {
      cerrarSesionLocal()
      return null
    }

    const { response, data } = await refrescarTokenUsuarioApi(sesion.refresh)
    if (!response.ok) {
      cerrarSesionLocal()
      return null
    }

    const tokens = extraerTokensAuth(data)
    if (!tokens.access || !tokens.refresh) {
      cerrarSesionLocal()
      return null
    }

    let usuario = tokens.usuario || sesion.usuario || null
    if (!usuario) {
      usuario = await obtenerPerfilActual(tokens.access)
    }

    setSesion({
      access: tokens.access,
      refresh: tokens.refresh,
      usuario,
    })

    return tokens.access
  }, [cerrarSesionLocal, obtenerPerfilActual, sesion.refresh, sesion.usuario])

  const iniciarSesion = useCallback(
    async (credenciales) => {
      setErrorAuth('')
      setCargandoAuth(true)

      try {
        const { response, data } = await iniciarSesionUsuarioApi(credenciales)

        if (!response.ok) {
          const mensaje = obtenerMensajeError(data, 'No se pudo iniciar sesion.')
          setErrorAuth(mensaje)
          return { ok: false, error: mensaje }
        }

        const tokens = extraerTokensAuth(data)
        if (!tokens.access || !tokens.refresh) {
          const mensaje = 'La respuesta de autenticacion no incluyo tokens validos.'
          setErrorAuth(mensaje)
          return { ok: false, error: mensaje }
        }

        let usuario = tokens.usuario || null
        if (!usuario) {
          usuario = await obtenerPerfilActual(tokens.access)
        }

        setSesion({
          access: tokens.access,
          refresh: tokens.refresh,
          usuario,
        })

        cerrarModalAuth()
        return { ok: true }
      } catch {
        const mensaje = 'No se pudo conectar con el backend para iniciar sesion.'
        setErrorAuth(mensaje)
        return { ok: false, error: mensaje }
      } finally {
        setCargandoAuth(false)
      }
    },
    [cerrarModalAuth, obtenerPerfilActual],
  )

  const registrarUsuario = useCallback(
    async (payload) => {
      setErrorAuth('')
      setCargandoAuth(true)

      try {
        const { response, data } = await registrarUsuarioApi(payload)

        if (!response.ok) {
          const mensaje = obtenerMensajeError(data, 'No se pudo crear la cuenta.')
          setErrorAuth(mensaje)
          return { ok: false, error: mensaje }
        }

        const tokens = extraerTokensAuth(data)
        if (!tokens.access || !tokens.refresh) {
          const mensaje = 'Cuenta creada sin tokens validos. Intenta iniciar sesion manualmente.'
          setErrorAuth(mensaje)
          return { ok: false, error: mensaje }
        }

        let usuario = tokens.usuario || null
        if (!usuario) {
          usuario = await obtenerPerfilActual(tokens.access)
        }

        setSesion({
          access: tokens.access,
          refresh: tokens.refresh,
          usuario,
        })

        cerrarModalAuth()
        return { ok: true }
      } catch {
        const mensaje = 'No se pudo conectar con el backend para registrar usuario.'
        setErrorAuth(mensaje)
        return { ok: false, error: mensaje }
      } finally {
        setCargandoAuth(false)
      }
    },
    [cerrarModalAuth, obtenerPerfilActual],
  )

  const cerrarSesion = useCallback(async () => {
    const refresh = sesion.refresh

    if (refresh) {
      try {
        await cerrarSesionUsuarioApi(refresh)
      } catch {
        // sin bloqueo
      }
    }

    cerrarSesionLocal()
  }, [cerrarSesionLocal, sesion.refresh])

  const ejecutarConAuth = useCallback(
    async (requestFn) => {
      if (!sesion.access) {
        return { response: { ok: false, status: 401 }, data: null }
      }

      const primerIntento = await requestFn(sesion.access)
      if (primerIntento.response.status !== 401) {
        return primerIntento
      }

      const accessNuevo = await refrescarAcceso()
      if (!accessNuevo) {
        return primerIntento
      }

      return requestFn(accessNuevo)
    },
    [refrescarAcceso, sesion.access],
  )

  const valor = useMemo(
    () => ({
      accessToken: sesion.access,
      refreshToken: sesion.refresh,
      usuario: sesion.usuario,
      isAuthenticated: Boolean(sesion.access),
      modalAuth,
      cargandoAuth,
      errorAuth,
      setErrorAuth,
      abrirModalAuth,
      cerrarModalAuth,
      cambiarModoAuth,
      iniciarSesion,
      registrarUsuario,
      cerrarSesion,
      refrescarAcceso,
      ejecutarConAuth,
    }),
    [
      abrirModalAuth,
      cambiarModoAuth,
      cargandoAuth,
      cerrarModalAuth,
      cerrarSesion,
      errorAuth,
      ejecutarConAuth,
      iniciarSesion,
      modalAuth,
      refrescarAcceso,
      registrarUsuario,
      sesion.access,
      sesion.refresh,
      sesion.usuario,
    ],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
