from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.models import Reserva
from api.serializers import SerializadorCrearReserva, SerializadorReserva
from api.services import ServicioReserva


class ReservaViewSet(viewsets.ModelViewSet):
    servicio_reserva = ServicioReserva()

    queryset = (
        Reserva.objects
        .filter(activo=True)
        .select_related('habitacion', 'habitacion__tipo_habitacion')
        .prefetch_related('precios_noche')
        .order_by('-creado_en')
    )

    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('estado', 'habitacion', 'habitacion__tipo_habitacion')
    search_fields = ('codigo_reserva', 'nombre_huesped', 'email_huesped', 'telefono_huesped')
    ordering_fields = ('creado_en', 'fecha_entrada', 'fecha_salida', 'precio_total')

    def get_serializer_class(self):
        if self.action == 'create':
            return SerializadorCrearReserva
        return SerializadorReserva

    def get_permissions(self):
        if self.action in ('create', 'por_codigo'):
            clases_permisos = [AllowAny]
        else:
            clases_permisos = [IsAuthenticated]
        return [permiso() for permiso in clases_permisos]

    @action(methods=['get'], detail=False, url_path='por-codigo')
    def por_codigo(self, request, *args, **kwargs):
        codigo = request.query_params.get('codigo_reserva') or request.query_params.get('codigo')
        if not codigo:
            return Response({'mensaje': 'codigo_reserva es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        reserva = self.queryset.filter(codigo_reserva=codigo).first()
        if not reserva:
            return Response({'mensaje': 'Reserva no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        serializador = SerializadorReserva(reserva)
        return Response(serializador.data, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        serializador = self.get_serializer(data=request.data)
        serializador.is_valid(raise_exception=True)

        reserva = self.servicio_reserva.crear_reserva(serializador.validated_data)

        serializador_respuesta = SerializadorReserva(reserva)
        return Response(serializador_respuesta.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        reserva = self.get_object()
        reserva.estado = Reserva.CANCELADA
        reserva.save(update_fields=['estado'])
        return Response({'mensaje': 'Reserva cancelada.'}, status=status.HTTP_200_OK)

    @action(methods=['post'], detail=True, url_path='registrar-entrada')
    def registrar_entrada(self, request, *args, **kwargs):
        reserva = self.get_object()
        if reserva.estado not in (Reserva.PENDIENTE, Reserva.CONFIRMADA):
            return Response(
                {'mensaje': 'No se puede registrar entrada desde el estado actual.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reserva.estado = Reserva.REGISTRADA_ENTRADA
        reserva.save(update_fields=['estado'])
        return Response({'mensaje': 'Entrada registrada.'}, status=status.HTTP_200_OK)

    @action(methods=['post'], detail=True, url_path='registrar-salida')
    def registrar_salida(self, request, *args, **kwargs):
        reserva = self.get_object()
        if reserva.estado != Reserva.REGISTRADA_ENTRADA:
            return Response(
                {'mensaje': 'No se puede registrar salida desde el estado actual.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reserva.estado = Reserva.REGISTRADA_SALIDA
        reserva.save(update_fields=['estado'])
        return Response({'mensaje': 'Salida registrada.'}, status=status.HTTP_200_OK)
