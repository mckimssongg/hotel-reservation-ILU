import random
import string

from django.db import transaction

from api.models import Habitacion, PrecioNocheReserva, Reserva
from api.services.availability_service import ServicioDisponibilidad
from api.services.pricing_service import ServicioPrecios
from api.utils.exceptions import ErrorConflictoReserva, ErrorValidacionHotel


class ServicioReserva:
    def __init__(self):
        self.servicio_disponibilidad = ServicioDisponibilidad()
        self.servicio_precios = ServicioPrecios()

    def crear_reserva(self, datos):
        habitacion_id = datos['habitacion_id']
        fecha_entrada = datos['fecha_entrada']
        fecha_salida = datos['fecha_salida']
        cantidad_huespedes = datos['cantidad_huespedes']

        with transaction.atomic():
            try:
                habitacion = (
                    Habitacion.objects
                    .select_related('tipo_habitacion')
                    .select_for_update()
                    .get(id=habitacion_id, activo=True, lista=True)
                )
            except Habitacion.DoesNotExist:
                raise ErrorValidacionHotel('La habitacion no existe o no esta disponible.')

            self.servicio_disponibilidad.validar_parametros(
                fecha_entrada,
                fecha_salida,
                cantidad_huespedes,
            )

            if habitacion.tipo_habitacion.capacidad < cantidad_huespedes:
                raise ErrorValidacionHotel('La cantidad de huespedes excede la capacidad del tipo de habitacion.')

            hay_traslape = (
                Reserva.objects
                .filter(
                    habitacion=habitacion,
                    fecha_entrada__lt=fecha_salida,
                    fecha_salida__gt=fecha_entrada,
                    activo=True,
                )
                .exclude(estado=Reserva.CANCELADA)
                .exists()
            )
            if hay_traslape:
                raise ErrorConflictoReserva('La habitacion ya tiene una reserva en ese rango de fechas.')

            resultado_precio = self.servicio_precios.calcular_precio_habitacion(
                habitacion,
                fecha_entrada,
                fecha_salida,
            )

            reserva = Reserva.objects.create(
                codigo_reserva=self._generar_codigo_reserva(),
                habitacion=habitacion,
                nombre_huesped=datos['nombre_huesped'],
                email_huesped=datos['email_huesped'],
                telefono_huesped=datos['telefono_huesped'],
                fecha_entrada=fecha_entrada,
                fecha_salida=fecha_salida,
                cantidad_huespedes=cantidad_huespedes,
                estado=Reserva.CONFIRMADA,
                precio_total=resultado_precio['total'],
                canal_reserva=datos.get('canal_reserva', 'web'),
                pagada=datos.get('pagada', False),
                notas=datos.get('notas', ''),
            )

            detalles = []
            for noche in resultado_precio['detalles_noches']:
                detalles.append(
                    PrecioNocheReserva(
                        reserva=reserva,
                        fecha=noche['fecha'],
                        precio_base=noche['precio_base'],
                        recargo_fin_semana=noche['recargo_fin_semana'],
                        descuento_estadia_larga=noche['descuento_estadia_larga'],
                        recargo_ocupacion=noche['recargo_ocupacion'],
                        precio_final=noche['precio_final'],
                    )
                )
            PrecioNocheReserva.objects.bulk_create(detalles)

            return reserva

    def _generar_codigo_reserva(self):
        alfabeto = string.ascii_uppercase + string.digits
        for _ in range(10):
            codigo = ''.join(random.choices(alfabeto, k=8))
            if not Reserva.objects.filter(codigo_reserva=codigo).exists():
                return codigo
        raise ErrorValidacionHotel('No se pudo generar el codigo de reserva.')
