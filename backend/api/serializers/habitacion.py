from rest_framework import serializers

from api.models import Habitacion, TipoHabitacion


class SerializadorTipoHabitacion(serializers.ModelSerializer):
    class Meta:
        model = TipoHabitacion
        fields = (
            'id',
            'nombre',
            'descripcion',
            'capacidad',
            'precio_base',
            'info_camas',
        )


class SerializadorHabitacion(serializers.ModelSerializer):
    tipo_habitacion = SerializadorTipoHabitacion(read_only=True)
    tipo_habitacion_id = serializers.PrimaryKeyRelatedField(
        source='tipo_habitacion',
        queryset=TipoHabitacion.objects.filter(activo=True),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Habitacion
        fields = (
            'id',
            'numero',
            'piso',
            'lista',
            'nota',
            'tipo_habitacion',
            'tipo_habitacion_id',
        )


class SerializadorHabitacionDisponible(SerializadorHabitacion):
    precio_total_estimado = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    cantidad_noches = serializers.IntegerField(read_only=True)

    class Meta(SerializadorHabitacion.Meta):
        fields = SerializadorHabitacion.Meta.fields + (
            'precio_total_estimado',
            'cantidad_noches',
        )


class SerializadorConsultaDisponibilidad(serializers.Serializer):
    fecha_entrada = serializers.DateField(required=True)
    fecha_salida = serializers.DateField(required=True)
    cantidad_huespedes = serializers.IntegerField(required=False, min_value=1, default=1)
    tipo_habitacion = serializers.IntegerField(required=False)


class SerializadorConsultaPrecio(serializers.Serializer):
    fecha_entrada = serializers.DateField(required=True)
    fecha_salida = serializers.DateField(required=True)
