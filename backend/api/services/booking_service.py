import random
import string

from django.db import IntegrityError, transaction

from api.exceptions import (
    ErrorConcurrenciaReserva,
    ErrorConflictoReserva,
    ErrorValidacionHotel,
    HabitacionNoDisponibleError,
)
from api.models import Habitacion, PrecioNocheReserva, Reserva
from api.services.availability_service import ServicioDisponibilidad
from api.services.pricing_service import ServicioPrecios


class ServicioReserva:
    CONSTRAINT_TRASLAPE = 'reserva_no_traslape_habitacion'
    CONSTRAINT_UNICA_FECHA = 'reserva_unica_habitacion_fechas'

    def __init__(self):
        self.servicio_disponibilidad = ServicioDisponibilidad()
        self.servicio_precios = ServicioPrecios()

    def crear_reserva(self, datos):
        habitacion_id = datos['habitacion_id']
        fecha_entrada = datos['fecha_entrada']
        fecha_salida = datos['fecha_salida']
        cantidad_huespedes = datos['cantidad_huespedes']

        with transaction.atomic():
            habitacion = self._bloquear_habitacion(habitacion_id)

            self.servicio_disponibilidad.validar_parametros(
                fecha_entrada,
                fecha_salida,
                cantidad_huespedes,
            )

            if habitacion.tipo_habitacion.capacidad < cantidad_huespedes:
                raise ErrorValidacionHotel('La cantidad de huespedes excede la capacidad del tipo de habitacion.')

            self._validar_traslape_bloqueado(habitacion.id, fecha_entrada, fecha_salida)

            resultado_precio = self.servicio_precios.calcular_precio_habitacion(
                habitacion,
                fecha_entrada,
                fecha_salida,
            )

            reserva = self._crear_reserva(
                datos=datos,
                habitacion=habitacion,
                fecha_entrada=fecha_entrada,
                fecha_salida=fecha_salida,
                cantidad_huespedes=cantidad_huespedes,
                precio_total=resultado_precio['total'],
            )

            self._crear_detalles_precio(reserva, resultado_precio['detalles_noches'])

            return reserva

    def _bloquear_habitacion(self, habitacion_id):
        try:
            return (
                Habitacion.objects
                .select_related('tipo_habitacion')
                .select_for_update()
                .get(id=habitacion_id, activo=True, lista=True)
            )
        except Habitacion.DoesNotExist:
            raise HabitacionNoDisponibleError('La habitacion no existe o no esta disponible.')

    def _validar_traslape_bloqueado(self, habitacion_id, fecha_entrada, fecha_salida):
        hay_traslape = (
            Reserva.objects
            .select_for_update()
            .filter(
                habitacion_id=habitacion_id,
                fecha_entrada__lt=fecha_salida,
                fecha_salida__gt=fecha_entrada,
                activo=True,
            )
            .exclude(estado=Reserva.CANCELADA)
            .exists()
        )
        if hay_traslape:
            raise ErrorConflictoReserva('La habitacion ya tiene una reserva en ese rango de fechas.')

    def _crear_reserva(
        self,
        datos,
        habitacion,
        fecha_entrada,
        fecha_salida,
        cantidad_huespedes,
        precio_total,
    ):
        for _ in range(8):
            try:
                return Reserva.objects.create(
                    codigo_reserva=self._generar_codigo_reserva(),
                    habitacion=habitacion,
                    nombre_huesped=datos['nombre_huesped'],
                    email_huesped=datos['email_huesped'],
                    telefono_huesped=datos['telefono_huesped'],
                    fecha_entrada=fecha_entrada,
                    fecha_salida=fecha_salida,
                    cantidad_huespedes=cantidad_huespedes,
                    estado=Reserva.CONFIRMADA,
                    precio_total=precio_total,
                    canal_reserva=datos.get('canal_reserva', 'web'),
                    pagada=datos.get('pagada', False),
                    notas=datos.get('notas', ''),
                )
            except IntegrityError as error:
                if self._es_conflicto_codigo(error):
                    continue
                self._traducir_error_integridad(error)

        raise ErrorConcurrenciaReserva('No se pudo generar un codigo de reserva unico. Intenta de nuevo.')

    def _crear_detalles_precio(self, reserva, detalles_noches):
        detalles = []
        for noche in detalles_noches:
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

        try:
            PrecioNocheReserva.objects.bulk_create(detalles)
        except IntegrityError as error:
            self._traducir_error_integridad(error)

    def _generar_codigo_reserva(self):
        alfabeto = string.ascii_uppercase + string.digits
        return ''.join(random.choices(alfabeto, k=8))

    def _traducir_error_integridad(self, error):
        nombre_constraint = self._obtener_constraint(error)
        mensaje_error = str(error).lower()

        if (
            nombre_constraint in (self.CONSTRAINT_TRASLAPE, self.CONSTRAINT_UNICA_FECHA)
            or self.CONSTRAINT_TRASLAPE in mensaje_error
            or self.CONSTRAINT_UNICA_FECHA in mensaje_error
        ):
            raise ErrorConcurrenciaReserva(
                'La habitacion se reservo mientras confirmabas. Intenta con otro rango.',
                detalle={'habitacion': 'ocupada'},
            ) from error

        if self._es_conflicto_codigo(error):
            raise ErrorConcurrenciaReserva('No se pudo generar un codigo de reserva unico. Intenta de nuevo.') from error

        raise ErrorValidacionHotel('No se pudo crear la reserva.') from error

    def _obtener_constraint(self, error):
        causa = getattr(error, '__cause__', None)
        diag = getattr(causa, 'diag', None)
        nombre_constraint = getattr(diag, 'constraint_name', '') or ''
        return nombre_constraint.lower()

    def _es_conflicto_codigo(self, error):
        nombre_constraint = self._obtener_constraint(error)
        mensaje_error = str(error).lower()
        return 'codigo_reserva' in nombre_constraint or 'codigo_reserva' in mensaje_error
