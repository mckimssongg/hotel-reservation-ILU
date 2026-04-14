import logging
import time

logger = logging.getLogger(__name__)


class MiddlewareRegistroPeticiones:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        inicio = time.time()
        id_peticion = f"pet-{int(inicio * 1000)}-{id(request)}"
        request.id_peticion = id_peticion

        response = self.get_response(request)

        duracion_ms = round((time.time() - inicio) * 1000, 2)
        logger.info(
            '%s %s %s %sms',
            request.method,
            request.path,
            response.status_code,
            duracion_ms,
            extra={
                'id_peticion': id_peticion,
            },
        )

        response['X-Id-Peticion'] = id_peticion
        return response
