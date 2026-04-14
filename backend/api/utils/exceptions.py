import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


class ErrorConflictoReserva(Exception):
    def __init__(self, mensaje='Esa habitacion ya se aparto en esas fechas.'):
        self.mensaje = mensaje
        super().__init__(mensaje)


class ErrorHabitacionNoDisponible(Exception):
    def __init__(self, mensaje='Esa habitacion no esta disponible.'):
        self.mensaje = mensaje
        super().__init__(mensaje)


class ErrorValidacionHotel(Exception):
    def __init__(self, mensaje, detalle=None):
        self.mensaje = mensaje
        self.detalle = detalle or {}
        super().__init__(mensaje)


def manejador_excepcion_personalizado(exc, contexto):
    respuesta = exception_handler(exc, contexto)

    if isinstance(exc, ErrorConflictoReserva):
        return construir_error('CONFLICTO_RESERVA', exc.mensaje, {}, status.HTTP_409_CONFLICT)

    if isinstance(exc, ErrorHabitacionNoDisponible):
        return construir_error('HABITACION_NO_DISPONIBLE', exc.mensaje, {}, status.HTTP_400_BAD_REQUEST)

    if isinstance(exc, ErrorValidacionHotel):
        return construir_error('ERROR_VALIDACION', exc.mensaje, exc.detalle, status.HTTP_400_BAD_REQUEST)

    if respuesta is None:
        logger.exception('error no controlado', exc_info=exc)
        return construir_error('ERROR_INTERNO', 'Se rompio algo en server.', {}, status.HTTP_500_INTERNAL_SERVER_ERROR)

    respuesta.data = {
        'codigo': mapear_codigo(respuesta.status_code),
        'mensaje': sacar_mensaje(respuesta.data),
        'detalle': respuesta.data if isinstance(respuesta.data, (dict, list)) else {},
    }
    return respuesta


def construir_error(codigo, mensaje, detalle, codigo_http):
    return Response(
        {
            'codigo': codigo,
            'mensaje': mensaje,
            'detalle': detalle,
        },
        status=codigo_http,
    )


def mapear_codigo(codigo_http):
    codigos = {
        400: 'SOLICITUD_INVALIDA',
        401: 'NO_AUTORIZADO',
        403: 'PROHIBIDO',
        404: 'NO_ENCONTRADO',
        405: 'METODO_NO_PERMITIDO',
        429: 'LIMITE_EXCEDIDO',
        500: 'ERROR_INTERNO',
    }
    return codigos.get(codigo_http, 'ERROR')


def sacar_mensaje(datos):
    if isinstance(datos, str):
        return datos
    if isinstance(datos, dict):
        if 'detail' in datos:
            return str(datos['detail'])
        if not datos:
            return 'Error en request.'
        primer_campo = next(iter(datos))
        primer_valor = datos[primer_campo]
        if isinstance(primer_valor, list) and primer_valor:
            return f"{primer_campo}: {primer_valor[0]}"
        return f"{primer_campo}: {primer_valor}"
    if isinstance(datos, list) and datos:
        return str(datos[0])
    return 'Error en request.'
