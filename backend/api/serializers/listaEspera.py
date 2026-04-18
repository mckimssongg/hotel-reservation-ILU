from rest_framework import serializers

from api.models import EntradaListaEspera, TipoHabitacion


class SerializadorCrearListaEspera(serializers.Serializer):
    tipo_habitacion_id = serializers.IntegerField(required=True)
    nombre_huesped = serializers.CharField(required=True, max_length=200)
    email_huesped = serializers.EmailField(required=True)
    telefono_huesped = serializers.CharField(required=True, max_length=30)
    fecha_entrada_preferida = serializers.DateField(required=True)
    fecha_salida_preferida = serializers.DateField(required=True)
    cantidad_huespedes = serializers.IntegerField(required=True, min_value=1)
    es_flexible = serializers.BooleanField(required=False, default=False)
    dias_flexibles = serializers.IntegerField(required=False, min_value=0, max_value=5, default=2)

    def validate_tipo_habitacion_id(self, valor):
        tipo = TipoHabitacion.objects.filter(id=valor, activo=True).first()
        if not tipo:
            raise serializers.ValidationError('El tipo de habitacion no existe o no esta activo.')
        return valor

    def validate(self, datos):
        fecha_entrada = datos.get('fecha_entrada_preferida')
        fecha_salida = datos.get('fecha_salida_preferida')

        if fecha_entrada and fecha_salida and fecha_salida <= fecha_entrada:
            raise serializers.ValidationError(
                {'fecha_salida_preferida': 'La fecha de salida debe ser mayor a la fecha de entrada.'}
            )

        tipo = TipoHabitacion.objects.filter(id=datos['tipo_habitacion_id'], activo=True).first()
        if tipo:
            datos['tipo_habitacion'] = tipo

        return datos


class SerializadorListaEspera(serializers.ModelSerializer):
    tipo_habitacion_nombre = serializers.CharField(source='tipo_habitacion.nombre', read_only=True)
    habitacion_retenida_numero = serializers.CharField(
        source='habitacion_retenida.numero',
        read_only=True,
        default=None,
    )

    class Meta:
        model = EntradaListaEspera
        fields = (
            'id',
            'tipo_habitacion',
            'tipo_habitacion_nombre',
            'nombre_huesped',
            'email_huesped',
            'telefono_huesped',
            'fecha_entrada_preferida',
            'fecha_salida_preferida',
            'cantidad_huespedes',
            'es_flexible',
            'dias_flexibles',
            'estado',
            'notificada_en',
            'retencion_hasta',
            'habitacion_retenida',
            'habitacion_retenida_numero',
            'fecha_entrada_asignada',
            'fecha_salida_asignada',
            'creado_en',
        )
