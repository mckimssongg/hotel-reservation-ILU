from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.serializers.stats import SerializadorConsultaDashboard
from api.services import ServicioEstadisticas


class EstadisticasViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        serializador = SerializadorConsultaDashboard(data=request.query_params)
        serializador.is_valid(raise_exception=True)
        datos = serializador.validated_data

        servicio = ServicioEstadisticas()
        resultado = servicio.obtener_dashboard(
            fecha_inicio=datos['fecha_inicio'],
            fecha_fin=datos['fecha_fin'],
        )

        return Response(resultado, status=status.HTTP_200_OK)
