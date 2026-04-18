from rest_framework import serializers

from api.exceptions import ErrorValidacionHotel


class SerializadorConsultaDashboard(serializers.Serializer):
    fecha_inicio = serializers.DateField(required=True)
    fecha_fin = serializers.DateField(required=True)

    def validate(self, datos):
        if datos['fecha_fin'] < datos['fecha_inicio']:
            raise ErrorValidacionHotel('La fecha fin debe ser mayor o igual a la fecha inicio.')
        return datos
