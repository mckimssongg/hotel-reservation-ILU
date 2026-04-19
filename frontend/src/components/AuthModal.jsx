import { useEffect, useState } from 'react'

import { credencialesIniciales, registroInicial } from '../constants/appConstants'
import { useAuth } from '../hooks/useAuth'

export default function AuthModal() {
  const {
    modalAuth,
    cargandoAuth,
    errorAuth,
    setErrorAuth,
    cerrarModalAuth,
    cambiarModoAuth,
    iniciarSesion,
    registrarUsuario,
  } = useAuth()

  const [credenciales, setCredenciales] = useState(credencialesIniciales)
  const [registro, setRegistro] = useState(registroInicial)

  useEffect(() => {
    if (!modalAuth.abierto) {
      return
    }

    setErrorAuth('')
  }, [modalAuth.abierto, setErrorAuth])

  useEffect(() => {
    if (!modalAuth.abierto) {
      return
    }

    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [modalAuth.abierto])

  function actualizarCredencial(event) {
    const { name, value } = event.target
    setCredenciales((anterior) => ({ ...anterior, [name]: value }))
  }

  function actualizarRegistro(event) {
    const { name, value } = event.target
    setRegistro((anterior) => ({ ...anterior, [name]: value }))
  }

  async function enviarLogin(event) {
    event.preventDefault()
    await iniciarSesion(credenciales)
  }

  async function enviarRegistro(event) {
    event.preventDefault()
    await registrarUsuario(registro)
  }

  if (!modalAuth.abierto) {
    return null
  }

  return (
    <div className="auth-modal-backdrop position-fixed top-0 start-0 w-100 h-100 d-flex align-items-end align-items-md-center justify-content-center p-3">
      <div className="auth-modal-sheet card border-0 rounded-4 shadow-sm w-100" onClick={(event) => event.stopPropagation()}>
        <div className="card-body p-4 p-md-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h4 mb-0">Hotel Gatas</h2>
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={cerrarModalAuth} />
          </div>

          <div className="btn-group w-100 mb-3" role="group" aria-label="Cambiar modo autenticacion">
            <button
              type="button"
              className={`btn ${modalAuth.modo === 'login' ? 'btn-hotel-primary' : 'btn-outline-hotel-primary'}`}
              onClick={() => cambiarModoAuth('login')}
            >
              Iniciar sesion
            </button>
            <button
              type="button"
              className={`btn ${modalAuth.modo === 'register' ? 'btn-hotel-primary' : 'btn-outline-hotel-primary'}`}
              onClick={() => cambiarModoAuth('register')}
            >
              Crear cuenta
            </button>
          </div>

          {errorAuth ? <div className="alert alert-danger py-2">{errorAuth}</div> : null}

          {modalAuth.modo === 'login' ? (
            <form className="d-grid gap-2" onSubmit={enviarLogin}>
              <label className="form-label mb-0" htmlFor="auth_usuario_login">
                Usuario
              </label>
              <input
                id="auth_usuario_login"
                name="usuario"
                type="text"
                className="form-control"
                value={credenciales.usuario}
                onChange={actualizarCredencial}
                required
              />

              <label className="form-label mb-0 mt-2" htmlFor="auth_clave_login">
                Clave
              </label>
              <input
                id="auth_clave_login"
                name="clave"
                type="password"
                className="form-control"
                value={credenciales.clave}
                onChange={actualizarCredencial}
                required
              />

              <button type="submit" className="btn btn-hotel-primary mt-3" disabled={cargandoAuth}>
                {cargandoAuth ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form className="row g-2" onSubmit={enviarRegistro}>
              <div className="col-12 col-md-6">
                <label className="form-label mb-0" htmlFor="auth_usuario_registro">
                  Usuario
                </label>
                <input
                  id="auth_usuario_registro"
                  name="usuario"
                  type="text"
                  className="form-control"
                  value={registro.usuario}
                  onChange={actualizarRegistro}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label mb-0" htmlFor="auth_correo_registro">
                  Correo
                </label>
                <input
                  id="auth_correo_registro"
                  name="correo"
                  type="email"
                  className="form-control"
                  value={registro.correo}
                  onChange={actualizarRegistro}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label mb-0" htmlFor="auth_nombre_registro">
                  Nombre
                </label>
                <input
                  id="auth_nombre_registro"
                  name="nombre"
                  type="text"
                  className="form-control"
                  value={registro.nombre}
                  onChange={actualizarRegistro}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label mb-0" htmlFor="auth_apellido_registro">
                  Apellido
                </label>
                <input
                  id="auth_apellido_registro"
                  name="apellido"
                  type="text"
                  className="form-control"
                  value={registro.apellido}
                  onChange={actualizarRegistro}
                />
              </div>

              <div className="col-12">
                <label className="form-label mb-0" htmlFor="auth_clave_registro">
                  Clave
                </label>
                <input
                  id="auth_clave_registro"
                  name="clave"
                  type="password"
                  className="form-control"
                  value={registro.clave}
                  onChange={actualizarRegistro}
                  minLength={8}
                  required
                />
              </div>

              <div className="col-12 mt-3">
                <button type="submit" className="btn btn-hotel-primary w-100" disabled={cargandoAuth}>
                  {cargandoAuth ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
