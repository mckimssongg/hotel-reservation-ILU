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
    OCUPACION_PRUEBA = Decimal('0.20')
    DESCUENTO_PRUEBA = Decimal('0.20')

    # codigo de descuento #NEGRITOBIMBO con 50% off
    DESCUENTO_ESPECIAL = Decimal('0.50')
    CODIGO_DESCUENTO = 'NEGRITOBIMBO'


    def aplicar_descuento_especial(self, precio, codigo_descuento):
        if codigo_descuento == self.CODIGO_DESCUENTO:
            return precio * self.DESCUENTO_ESPECIAL
        return precio

    def calcular_precio_habitacion(self, habitacion: Habitacion, fecha_entrada, fecha_salida, reserva_id_excluir=None, codigo_descuento=None):
        if fecha_salida <= fecha_entrada:
            raise ErrorValidacionHotel('La fecha de salida debe ser mayor a la fecha de entrada.')

        total_habitaciones = Habitacion.objects.filter(activo=True, lista=True).count()

        reservas_rango = list(
            Reserva.objects
            .filter(
                fecha_entrada__lt=fecha_salida,
                fecha_salida__gt=fecha_entrada,
                activo=True,
            )
            .exclude(estado=Reserva.CANCELADA)
            .only('id', 'fecha_entrada', 'fecha_salida')
        )

        if reserva_id_excluir:
            reservas_rango = [r for r in reservas_rango if r.id != reserva_id_excluir]

        cantidad_noches = (fecha_salida - fecha_entrada).days
        subtotal = Decimal('0.00')
        detalles_noches = []

        for indice in range(cantidad_noches):
            fecha_noche = fecha_entrada + timedelta(days=indice)
            detalle = self._calcular_noche(
                habitacion,
                fecha_noche,
                total_habitaciones,
                reservas_rango,
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

        # 50% de descuento con codigo de descuento NEGRITOBIMBO
        descuento_especial = Decimal('0.00')
        if codigo_descuento == self.CODIGO_DESCUENTO:
            descuento_especial = self.aplicar_descuento_especial(total, codigo_descuento)
            total = (total - descuento_especial).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        print('descuento_especial', descuento_especial)
        return {
            'cantidad_noches': cantidad_noches,
            'subtotal': subtotal.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            'descuento_estadia_larga': descuento_estadia_larga,
            'descuento_especial': descuento_especial,
            'total': total,
            'detalles_noches': detalles_noches,
        }

    def _calcular_noche(self, habitacion: Habitacion, fecha_noche, total_habitaciones, reservas_rango):
        precio_base = habitacion.tipo_habitacion.precio_base
        recargo_fin_semana = Decimal('0.00')
        recargo_ocupacion = Decimal('0.00')
        recargo_prueba = Decimal('0.00')

        if fecha_noche.weekday() in (4, 5):
            recargo_fin_semana = (precio_base * self.PORC_RECARGO_FIN_SEMANA).quantize(
                Decimal('0.01'),
                rounding=ROUND_HALF_UP,
            )

        precio_previo = precio_base + recargo_fin_semana
        tasa_ocupacion = self._calcular_ocupacion_noche(
            fecha_noche,
            total_habitaciones,
            reservas_rango,
        )
        
        #80
        if tasa_ocupacion > self.UMBRAL_OCUPACION:
            recargo_ocupacion = (precio_previo * self.PORC_RECARGO_OCUPACION).quantize(
                Decimal('0.01'),
                rounding=ROUND_HALF_UP,
            )

        # tasa_ocupacion <= #20  Not fecha_noche.weekday() in (4, 5)
        if not fecha_noche.weekday() in (4, 5) and tasa_ocupacion <= self.OCUPACION_PRUEBA:
            recargo_prueba = (precio_previo * self.DESCUENTO_PRUEBA).quantize(
                Decimal('0.01'),
                rounding=ROUND_HALF_UP,
            )

        precio_final = (precio_base + recargo_fin_semana + recargo_ocupacion - recargo_prueba).quantize(
            Decimal('0.01'),
            rounding=ROUND_HALF_UP,
        )

        return {
            'fecha': fecha_noche,
            'precio_base': precio_base,
            'recargo_fin_semana': recargo_fin_semana,
            'recargo_ocupacion': recargo_ocupacion,
            'recargo_prueba': recargo_prueba,
            'descuento_estadia_larga': Decimal('0.00'),
            'precio_final': precio_final,
        }

    def _calcular_ocupacion_noche(self, fecha_noche, total_habitaciones, reservas_rango):
        if total_habitaciones == 0:
            return Decimal('0.00')

        ocupadas = sum(
            1 for r in reservas_rango
            if r.fecha_entrada <= fecha_noche and r.fecha_salida > fecha_noche
        )

        return Decimal(ocupadas) / Decimal(total_habitaciones)
