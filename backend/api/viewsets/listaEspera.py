from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.models import EntradaListaEspera
from api.serializers.listaEspera import SerializadorCrearListaEspera, SerializadorListaEspera
from api.services import ServicioReserva
from api.services.waitlist_service import ServicioListaEspera


class ListaEsperaViewSet(viewsets.ModelViewSet):
    queryset = (
        EntradaListaEspera.objects
        .filter(activo=True)
        .select_related('tipo_habitacion', 'habitacion_retenida')
        .order_by('creado_en')
    )
    serializer_class = SerializadorListaEspera

    def get_serializer_class(self):
        if self.action == 'create':
            return SerializadorCrearListaEspera
        return SerializadorListaEspera

    def get_permissions(self):
        if self.action in ('create', 'estado', 'confirmar'):
            return [AllowAny()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializador = self.get_serializer(data=request.data)
        serializador.is_valid(raise_exception=True)

        servicio = ServicioListaEspera()
        entrada = servicio.crear_entrada(serializador.validated_data)

        respuesta = SerializadorListaEspera(entrada).data
        return Response(respuesta, status=status.HTTP_201_CREATED)

    @action(methods=['get'], detail=True, url_path='estado')
    def estado(self, request, *args, **kwargs):
        entrada = self.get_object()
        servicio = ServicioListaEspera()
        resultado = servicio.consultar_estado_entrada(entrada.id)
        return Response(resultado, status=status.HTTP_200_OK)

    @action(methods=['post'], detail=True, url_path='confirmar')
    def confirmar(self, request, *args, **kwargs):
        entrada = self.get_object()
        servicio = ServicioListaEspera()
        servicio_reserva = ServicioReserva()

        reserva = servicio.confirmar_reserva_desde_espera(
            entrada_id=entrada.id,
            servicio_reserva=servicio_reserva,
        )

        from api.serializers import SerializadorReserva
        respuesta = SerializadorReserva(reserva).data
        return Response(respuesta, status=status.HTTP_201_CREATED)
