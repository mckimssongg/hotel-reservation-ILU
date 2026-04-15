from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from api.exceptions import ErrorValidacionHotel
from api.models import Habitacion, Reserva


class ServicioPrecios:
    PORC_RECARGO_FIN_SEMANA = Decimal('0.15')
    PORC_RECARGO_OCUPACION = Decimal('0.20')
    PORC_DESCUENTO_ESTADIA_LARGA = Decimal('0.10')
    UMBRAL_OCUPACION = Decimal('0.80')
    NOCHES_MIN_ESTADIA_LARGA = 5

    def calcular_precio_habitacion(self, habitacion: Habitacion, fecha_entrada, fecha_salida, reserva_id_excluir=None):
        if fecha_salida <= fecha_entrada:
            raise ErrorValidacionHotel('La fecha de salida debe ser mayor a la fecha de entrada.')

        cantidad_noches = (fecha_salida - fecha_entrada).days
        subtotal = Decimal('0.00')
        detalles_noches = []

        for indice in range(cantidad_noches):
            fecha_noche = fecha_entrada + timedelta(days=indice)
            detalle = self._calcular_noche(
                habitacion,
                fecha_noche,
                reserva_id_excluir=reserva_id_excluir,
            )
            detalles_noches.append(detalle)
            subtotal += detalle['precio_final']

        descuento_estadia_larga = Decimal('0.00')
        if cantidad_noches >= self.NOCHES_MIN_ESTADIA_LARGA:
            descuento_estadia_larga = (subtotal * self.PORC_DESCUENTO_ESTADIA_LARGA).quantize(
                Decimal('0.01'),
                rounding=ROUND_HALF_UP,
            )

        total = (subtotal - descuento_estadia_larga).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        if cantidad_noches and descuento_estadia_larga > 0:
            descuento_por_noche = (descuento_estadia_larga / cantidad_noches).quantize(
                Decimal('0.01'),
                rounding=ROUND_HALF_UP,
            )
            for detalle in detalles_noches:
                detalle['descuento_estadia_larga'] = descuento_por_noche
                detalle['precio_final'] = (detalle['precio_final'] - descuento_por_noche).quantize(
                    Decimal('0.01'),
                    rounding=ROUND_HALF_UP,
                )

        return {
            'cantidad_noches': cantidad_noches,
            'subtotal': subtotal.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            'descuento_estadia_larga': descuento_estadia_larga,
            'total': total,
            'detalles_noches': detalles_noches,
        }

    def _calcular_noche(self, habitacion: Habitacion, fecha_noche, reserva_id_excluir=None):
        precio_base = habitacion.tipo_habitacion.precio_base
        recargo_fin_semana = Decimal('0.00')
        recargo_ocupacion = Decimal('0.00')

        if fecha_noche.weekday() in (4, 5):
            recargo_fin_semana = (precio_base * self.PORC_RECARGO_FIN_SEMANA).quantize(
                Decimal('0.01'),
                rounding=ROUND_HALF_UP,
            )

        precio_previo = precio_base + recargo_fin_semana
        tasa_ocupacion = self._calcular_ocupacion_hotel(
            fecha_noche,
            reserva_id_excluir=reserva_id_excluir,
        )

        if tasa_ocupacion > self.UMBRAL_OCUPACION:
            recargo_ocupacion = (precio_previo * self.PORC_RECARGO_OCUPACION).quantize(
                Decimal('0.01'),
                rounding=ROUND_HALF_UP,
            )

        precio_final = (precio_base + recargo_fin_semana + recargo_ocupacion).quantize(
            Decimal('0.01'),
            rounding=ROUND_HALF_UP,
        )

        return {
            'fecha': fecha_noche,
            'precio_base': precio_base,
            'recargo_fin_semana': recargo_fin_semana,
            'recargo_ocupacion': recargo_ocupacion,
            'descuento_estadia_larga': Decimal('0.00'),
            'precio_final': precio_final,
        }

    def _calcular_ocupacion_hotel(self, fecha_noche, reserva_id_excluir=None):
        total_habitaciones = Habitacion.objects.filter(activo=True, lista=True).count()
        if total_habitaciones == 0:
            return Decimal('0.00')

        reservas_ocupadas = (
            Reserva.objects
            .filter(
                fecha_entrada__lte=fecha_noche,
                fecha_salida__gt=fecha_noche,
                activo=True,
            )
            .exclude(estado=Reserva.CANCELADA)
        )

        if reserva_id_excluir:
            reservas_ocupadas = reservas_ocupadas.exclude(id=reserva_id_excluir)

        ocupadas = reservas_ocupadas.count()

        return Decimal(ocupadas) / Decimal(total_habitaciones)
