from rest_framework import serializers

from api.models import PrecioNocheReserva, Reserva
from api.serializers.habitacion import SerializadorHabitacion


class SerializadorPrecioNocheReserva(serializers.ModelSerializer):
    class Meta:
        model = PrecioNocheReserva
        fields = (
            'fecha',
            'precio_base',
            'recargo_fin_semana',
            'descuento_estadia_larga',
            'recargo_ocupacion',
            'precio_final',
        )


class SerializadorReserva(serializers.ModelSerializer):
    habitacion = SerializadorHabitacion(read_only=True)
    precios_noche = SerializadorPrecioNocheReserva(many=True, read_only=True)

    class Meta:
        model = Reserva
        fields = (
            'id',
            'codigo_reserva',
            'habitacion',
            'nombre_huesped',
            'email_huesped',
            'telefono_huesped',
            'fecha_entrada',
            'fecha_salida',
            'cantidad_huespedes',
            'estado',
            'precio_total',
            'canal_reserva',
            'pagada',
            'notas',
            'precios_noche',
            'creado_en',
            'actualizado_en',
        )


class SerializadorCrearReserva(serializers.Serializer):
    habitacion_id = serializers.IntegerField(required=True)
    nombre_huesped = serializers.CharField(required=True, max_length=200)
    email_huesped = serializers.EmailField(required=True)
    telefono_huesped = serializers.CharField(required=True, max_length=30)
    fecha_entrada = serializers.DateField(required=True)
    fecha_salida = serializers.DateField(required=True)
    cantidad_huespedes = serializers.IntegerField(required=True, min_value=1)
    canal_reserva = serializers.CharField(required=False, max_length=20, default='web')
    pagada = serializers.BooleanField(required=False, default=False)
    notas = serializers.CharField(required=False, allow_blank=True, default='')
