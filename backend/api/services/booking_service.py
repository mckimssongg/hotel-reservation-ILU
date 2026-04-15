import random
import string
from decimal import Decimal, ROUND_HALF_UP

from django.db import IntegrityError, transaction

from api.exceptions import (
    ErrorConfirmacionModificacionRequerida,
    ErrorConcurrenciaReserva,
    ErrorConflictoReserva,
    ErrorModificacionReservaNoPermitida,
    ErrorValidacionHotel,
    HabitacionNoDisponibleError,
)
from api.models import Habitacion, PrecioNocheReserva, Reserva
from api.services.availability_service import ServicioDisponibilidad
from api.services.pricing_service import ServicioPrecios


class ServicioReserva:
    CONSTRAINT_TRASLAPE = 'reserva_no_traslape_habitacion'
    CONSTRAINT_UNICA_FECHA = 'reserva_unica_habitacion_fechas'
    ESTADOS_MODIFICABLES = (Reserva.PENDIENTE, Reserva.CONFIRMADA)

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

            resultado_precio = self._validar_y_calcular_precio(
                habitacion=habitacion,
                fecha_entrada=fecha_entrada,
                fecha_salida=fecha_salida,
                cantidad_huespedes=cantidad_huespedes,
                reserva_id_excluir=None,
                bloquear=True,
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

    def cotizar_modificacion(self, reserva_id, datos):
        reserva = self._obtener_reserva_para_modificacion(reserva_id=reserva_id, bloquear=False)
        self._validar_estado_modificable(reserva)

        fecha_entrada = datos['fecha_entrada']
        fecha_salida = datos['fecha_salida']
        cantidad_huespedes = datos.get('cantidad_huespedes', reserva.cantidad_huespedes)

        resultado_precio_nuevo = self._validar_y_calcular_precio(
            habitacion=reserva.habitacion,
            fecha_entrada=fecha_entrada,
            fecha_salida=fecha_salida,
            cantidad_huespedes=cantidad_huespedes,
            reserva_id_excluir=reserva.id,
            bloquear=False,
        )

        precio_original = Decimal(reserva.precio_total).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        precio_nuevo = Decimal(resultado_precio_nuevo['total']).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        diferencia = (precio_nuevo - precio_original).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        tipo_diferencia, cargo_adicional, reembolso = self._resolver_movimiento(diferencia)

        return {
            'reserva_id': reserva.id,
            'codigo_reserva': reserva.codigo_reserva,
            'estado_reserva': reserva.estado,
            'fecha_entrada_original': reserva.fecha_entrada,
            'fecha_salida_original': reserva.fecha_salida,
            'fecha_entrada_nueva': fecha_entrada,
            'fecha_salida_nueva': fecha_salida,
            'cantidad_huespedes_original': reserva.cantidad_huespedes,
            'cantidad_huespedes_nueva': cantidad_huespedes,
            'precio_original': str(precio_original),
            'precio_nuevo': str(precio_nuevo),
            'diferencia': str(diferencia),
            'tipo_diferencia': tipo_diferencia,
            'cargo_adicional': str(cargo_adicional),
            'reembolso': str(reembolso),
            'desglose_original': self._serializar_desglose_reserva(reserva),
            'desglose_nuevo': self._serializar_detalles_precio(resultado_precio_nuevo['detalles_noches']),
        }

    def confirmar_modificacion(self, reserva_id, datos):
        if not datos.get('confirmar', False):
            raise ErrorConfirmacionModificacionRequerida(
                'Debes confirmar explicitamente la modificacion.',
                detalle={'confirmar': 'Debe ser true para confirmar la modificacion.'},
            )

        fecha_entrada = datos['fecha_entrada']
        fecha_salida = datos['fecha_salida']

        with transaction.atomic():
            reserva = self._obtener_reserva_para_modificacion(reserva_id=reserva_id, bloquear=True)
            self._validar_estado_modificable(reserva)

            cantidad_huespedes = datos.get('cantidad_huespedes', reserva.cantidad_huespedes)

            resultado_precio_nuevo = self._validar_y_calcular_precio(
                habitacion=reserva.habitacion,
                fecha_entrada=fecha_entrada,
                fecha_salida=fecha_salida,
                cantidad_huespedes=cantidad_huespedes,
                reserva_id_excluir=reserva.id,
                bloquear=True,
            )

            reserva.fecha_entrada = fecha_entrada
            reserva.fecha_salida = fecha_salida
            reserva.cantidad_huespedes = cantidad_huespedes
            reserva.precio_total = resultado_precio_nuevo['total']

            try:
                reserva.save(update_fields=['fecha_entrada', 'fecha_salida', 'cantidad_huespedes', 'precio_total'])
            except IntegrityError as error:
                self._traducir_error_integridad(error)

            reserva.precios_noche.all().delete()
            self._crear_detalles_precio(reserva, resultado_precio_nuevo['detalles_noches'])

            return self._obtener_reserva_serializable(reserva.id)

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

    def _validar_traslape_bloqueado(
        self,
        habitacion_id,
        fecha_entrada,
        fecha_salida,
        reserva_id_excluir=None,
        bloquear=True,
    ):
        reservas = (
            Reserva.objects
            .filter(
                habitacion_id=habitacion_id,
                fecha_entrada__lt=fecha_salida,
                fecha_salida__gt=fecha_entrada,
                activo=True,
            )
            .exclude(estado=Reserva.CANCELADA)
        )

        if reserva_id_excluir:
            reservas = reservas.exclude(id=reserva_id_excluir)

        if bloquear:
            reservas = reservas.select_for_update()

        hay_traslape = reservas.exists()
        if hay_traslape:
            raise ErrorConflictoReserva('La habitacion ya tiene una reserva en ese rango de fechas.')

    def _obtener_reserva_para_modificacion(self, reserva_id, bloquear=False):
        consulta = (
            Reserva.objects
            .select_related('habitacion', 'habitacion__tipo_habitacion')
            .prefetch_related('precios_noche')
            .filter(id=reserva_id, activo=True)
        )

        if bloquear:
            consulta = consulta.select_for_update()

        reserva = consulta.first()
        if not reserva:
            raise ErrorValidacionHotel('La reserva no existe o no esta activa.')
        return reserva

    def _validar_estado_modificable(self, reserva):
        if reserva.estado not in self.ESTADOS_MODIFICABLES:
            raise ErrorModificacionReservaNoPermitida(
                'Solo se puede modificar una reserva pendiente o confirmada.',
                detalle={'estado': reserva.estado},
            )

    def _validar_y_calcular_precio(
        self,
        habitacion,
        fecha_entrada,
        fecha_salida,
        cantidad_huespedes,
        reserva_id_excluir=None,
        bloquear=True,
    ):
        self.servicio_disponibilidad.validar_parametros(
            fecha_entrada,
            fecha_salida,
            cantidad_huespedes,
        )

        if habitacion.tipo_habitacion.capacidad < cantidad_huespedes:
            raise ErrorValidacionHotel('La cantidad de huespedes excede la capacidad del tipo de habitacion.')

        self._validar_traslape_bloqueado(
            habitacion_id=habitacion.id,
            fecha_entrada=fecha_entrada,
            fecha_salida=fecha_salida,
            reserva_id_excluir=reserva_id_excluir,
            bloquear=bloquear,
        )

        return self.servicio_precios.calcular_precio_habitacion(
            habitacion,
            fecha_entrada,
            fecha_salida,
            reserva_id_excluir=reserva_id_excluir,
        )

    def _obtener_reserva_serializable(self, reserva_id):
        return (
            Reserva.objects
            .select_related('habitacion', 'habitacion__tipo_habitacion')
            .prefetch_related('precios_noche')
            .get(id=reserva_id)
        )

    def _resolver_movimiento(self, diferencia):
        cero = Decimal('0.00')

        if diferencia > cero:
            return 'cargo_adicional', diferencia, cero
        if diferencia < cero:
            return 'reembolso', cero, abs(diferencia)

        return 'sin_cambio', cero, cero

    def _serializar_desglose_reserva(self, reserva):
        desglose = []
        for noche in reserva.precios_noche.all().order_by('fecha'):
            desglose.append(
                {
                    'fecha': noche.fecha,
                    'precio_base': str(noche.precio_base),
                    'recargo_fin_semana': str(noche.recargo_fin_semana),
                    'descuento_estadia_larga': str(noche.descuento_estadia_larga),
                    'recargo_ocupacion': str(noche.recargo_ocupacion),
                    'precio_final': str(noche.precio_final),
                }
            )
        return desglose

    def _serializar_detalles_precio(self, detalles_noches):
        desglose = []
        for noche in detalles_noches:
            desglose.append(
                {
                    'fecha': noche['fecha'],
                    'precio_base': str(noche['precio_base']),
                    'recargo_fin_semana': str(noche['recargo_fin_semana']),
                    'descuento_estadia_larga': str(noche['descuento_estadia_larga']),
                    'recargo_ocupacion': str(noche['recargo_ocupacion']),
                    'precio_final': str(noche['precio_final']),
                }
            )
        return desglose

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
