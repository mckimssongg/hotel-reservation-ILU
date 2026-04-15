from datetime import date

from api.exceptions import ErrorValidacionHotel
from api.models import Habitacion, Reserva, TipoHabitacion


class ServicioDisponibilidad:
    def validar_parametros(self, fecha_entrada: date, fecha_salida: date, cantidad_huespedes: int):
        hoy = date.today()
        if fecha_entrada < hoy:
            raise ErrorValidacionHotel('La fecha de entrada no puede ser pasada.')
        if fecha_salida <= fecha_entrada:
            raise ErrorValidacionHotel('La fecha de salida debe ser mayor a la fecha de entrada.')
        if cantidad_huespedes < 1:
            raise ErrorValidacionHotel('La cantidad de huespedes debe ser al menos 1.')

    def obtener_habitaciones_disponibles(
        self,
        fecha_entrada: date,
        fecha_salida: date,
        cantidad_huespedes: int,
        tipo_habitacion_id: int | None = None,
    ):
        self.validar_parametros(fecha_entrada, fecha_salida, cantidad_huespedes)

        habitaciones = (
            Habitacion.objects
            .select_related('tipo_habitacion')
            .filter(
                activo=True,
                lista=True,
                tipo_habitacion__capacidad__gte=cantidad_huespedes,
            )
        )

        if tipo_habitacion_id:
            tipo_habitacion = TipoHabitacion.objects.filter(id=tipo_habitacion_id, activo=True).first()
            if not tipo_habitacion:
                raise ErrorValidacionHotel('El tipo de habitacion no existe o no esta activo.')
            if cantidad_huespedes > tipo_habitacion.capacidad:
                raise ErrorValidacionHotel(
                    'La cantidad de huespedes excede la capacidad del tipo de habitacion seleccionado.'
                )
            habitaciones = habitaciones.filter(tipo_habitacion_id=tipo_habitacion_id)

        ids_ocupadas = (
            Reserva.objects
            .filter(
                fecha_entrada__lt=fecha_salida,
                fecha_salida__gt=fecha_entrada,
                activo=True,
            )
            .exclude(estado=Reserva.CANCELADA)
            .values_list('habitacion_id', flat=True)
        )

        return habitaciones.exclude(id__in=ids_ocupadas).order_by('numero')
