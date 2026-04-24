import { formatearMoneda } from '../utils/hotelHelpers'

function formatearFechaNoche(fechaISO) {
  if (!fechaISO) {
    return '-'
  }

  try {
    const fecha = new Date(`${fechaISO}T00:00:00`)
    return new Intl.DateTimeFormat('es-GT', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(fecha)
  } catch {
    return fechaISO
  }
}

function esValorPositivo(valor) {
  return Number(valor || 0) > 0
}

export default function DesglosePrecio({ detallesNoches, totalFinal, cargando }) {
  if (cargando) {
    return (
      <div className="rounded-3 p-3 mb-3" style={{ backgroundColor: 'var(--hotel-color-fondo)' }}>
        <p className="mb-0 text-secondary text-center small">Calculando desglose de precio...</p>
      </div>
    )
  }

  if (!detallesNoches || detallesNoches.length === 0) {
    return null
  }

  return (
    <div className="mb-3">
      <h6 className="mb-2">
        <i className="bi bi-receipt me-1" />
        Desglose de precio
      </h6>
      <div className="table-responsive">
        <table className="table table-sm table-bordered mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th>Noche</th>
              <th className="text-end">Base</th>
              <th className="text-end">Fin Sem.</th>
              <th className="text-end">Ocup.</th>
              <th className="text-end">Desc. Larga</th>
              <th className="text-end fw-semibold">Final</th>
            </tr>
          </thead>
          <tbody>
            {detallesNoches.map((noche) => (
              <tr key={noche.fecha}>
                <td className="small">{formatearFechaNoche(noche.fecha)}</td>
                <td className="text-end small">{formatearMoneda(noche.precio_base)}</td>
                <td className="text-end small">
                  {esValorPositivo(noche.recargo_fin_semana) ? (
                    <span className="text-warning">+{formatearMoneda(noche.recargo_fin_semana)}</span>
                  ) : (
                    <span className="text-secondary">-</span>
                  )}
                </td>
                <td className="text-end small">
                  {esValorPositivo(noche.recargo_ocupacion) ? (
                    <span className="text-danger">+{formatearMoneda(noche.recargo_ocupacion)}</span>
                  ) : (
                    <span className="text-secondary">-</span>
                  )}
                </td>
                <td className="text-end small">
                  {esValorPositivo(noche.descuento_estadia_larga) ? (
                    <span className="text-success">-{formatearMoneda(noche.descuento_estadia_larga)}</span>
                  ) : (
                    <span className="text-secondary">-</span>
                  )}
                </td>
                <td className="text-end small fw-semibold">{formatearMoneda(noche.precio_final)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="table-light">
              <td colSpan={5} className="fw-semibold">Total</td>
              <td className="text-end fw-bold">{formatearMoneda(totalFinal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
