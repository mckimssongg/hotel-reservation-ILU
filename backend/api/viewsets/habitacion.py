from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.models import Habitacion, TipoHabitacion
from api.serializers import (
    SerializadorConsultaCalendarioMensual,
    SerializadorConsultaDisponibilidad,
    SerializadorConsultaPrecio,
    SerializadorHabitacion,
    SerializadorTipoHabitacion,
)
from api.services import ServicioDisponibilidad, ServicioPrecios


class TipoHabitacionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TipoHabitacion.objects.filter(activo=True).order_by('nombre')
    serializer_class = SerializadorTipoHabitacion
    permission_classes = [AllowAny]

    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('nombre', 'capacidad')
    search_fields = ('nombre', 'descripcion', 'info_camas')
    ordering_fields = ('nombre', 'capacidad', 'precio_base')


class HabitacionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Habitacion.objects.filter(activo=True, lista=True).select_related('tipo_habitacion').order_by('numero')
    serializer_class = SerializadorHabitacion
    permission_classes = [AllowAny]

    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('tipo_habitacion', 'piso')
    search_fields = ('numero', 'tipo_habitacion__nombre')
    ordering_fields = ('numero', 'piso')

    @action(methods=['get'], detail=False, url_path='disponibles')
    def disponibles(self, request, *args, **kwargs):
        serializador_consulta = SerializadorConsultaDisponibilidad(data=request.query_params)
        serializador_consulta.is_valid(raise_exception=True)
        datos = serializador_consulta.validated_data

        servicio_disponibilidad = ServicioDisponibilidad()
        servicio_precios = ServicioPrecios()

        habitaciones = servicio_disponibilidad.obtener_habitaciones_disponibles(
            fecha_entrada=datos['fecha_entrada'],
            fecha_salida=datos['fecha_salida'],
            cantidad_huespedes=datos.get('cantidad_huespedes', 1),
            tipo_habitacion_id=datos.get('tipo_habitacion'),
        )

        respuesta = []
        for habitacion in habitaciones:
            item = SerializadorHabitacion(habitacion).data
            resultado_precio = servicio_precios.calcular_precio_habitacion(
                habitacion,
                datos['fecha_entrada'],
                datos['fecha_salida'],
            )
            item['precio_total_estimado'] = str(resultado_precio['total'])
            item['cantidad_noches'] = resultado_precio['cantidad_noches']
            respuesta.append(item)

        pagina = self.paginate_queryset(respuesta)
        if pagina is not None:
            return self.get_paginated_response(pagina)

        return Response(respuesta, status=status.HTTP_200_OK)

    @action(methods=['get'], detail=False, url_path='calendario-mensual')
    def calendario_mensual(self, request, *args, **kwargs):
        serializador_consulta = SerializadorConsultaCalendarioMensual(data=request.query_params)
        serializador_consulta.is_valid(raise_exception=True)
        datos = serializador_consulta.validated_data

        servicio_disponibilidad = ServicioDisponibilidad()
        matriz = servicio_disponibilidad.obtener_matriz_calendario(
            mes=datos['mes'],
            anio=datos['anio'],
            tipo_habitacion_id=datos.get('tipo_habitacion'),
            piso=datos.get('piso'),
        )

        return Response(matriz, status=status.HTTP_200_OK)

    @action(methods=['get'], detail=True, url_path='precio')
    def precio(self, request, *args, **kwargs):
        serializador_consulta = SerializadorConsultaPrecio(data=request.query_params)
        serializador_consulta.is_valid(raise_exception=True)
        datos = serializador_consulta.validated_data

        habitacion = self.get_object()
        servicio_precios = ServicioPrecios()
        resultado = servicio_precios.calcular_precio_habitacion(
            habitacion,
            datos['fecha_entrada'],
            datos['fecha_salida'],
        )

        detalle_noches = []
        for noche in resultado['detalles_noches']:
            detalle_noches.append(
                {
                    'fecha': noche['fecha'],
                    'precio_base': str(noche['precio_base']),
                    'recargo_fin_semana': str(noche['recargo_fin_semana']),
                    'descuento_estadia_larga': str(noche['descuento_estadia_larga']),
                    'recargo_ocupacion': str(noche['recargo_ocupacion']),
                    'precio_final': str(noche['precio_final']),
                }
            )

        return Response(
            {
                'habitacion_id': habitacion.id,
                'fecha_entrada': datos['fecha_entrada'],
                'fecha_salida': datos['fecha_salida'],
                'cantidad_noches': resultado['cantidad_noches'],
                'subtotal': str(resultado['subtotal']),
                'descuento_estadia_larga': str(resultado['descuento_estadia_larga']),
                'total': str(resultado['total']),
                'detalles_noches': detalle_noches,
            },
            status=status.HTTP_200_OK,
        )
