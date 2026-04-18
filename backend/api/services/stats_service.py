from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Count, Q, Sum

from api.exceptions import ErrorValidacionHotel
from api.models import Habitacion, Reserva, TipoHabitacion


class ServicioEstadisticas:

    def obtener_dashboard(self, fecha_inicio, fecha_fin):
        if fecha_fin < fecha_inicio:
            raise ErrorValidacionHotel('La fecha fin debe ser mayor o igual a la fecha inicio.')

        fecha_fin_exclusivo = fecha_fin + timedelta(days=1)
        total_dias = (fecha_fin_exclusivo - fecha_inicio).days

        if total_dias <= 0:
            raise ErrorValidacionHotel('El rango de fechas debe ser de al menos un dia.')

        habitaciones = list(
            Habitacion.objects
            .filter(activo=True, lista=True)
            .select_related('tipo_habitacion')
            .order_by('numero')
        )

        reservas_rango = list(
            Reserva.objects
            .filter(
                fecha_entrada__lt=fecha_fin_exclusivo,
                fecha_salida__gt=fecha_inicio,
                activo=True,
            )
            .exclude(estado=Reserva.CANCELADA)
            .select_related('habitacion', 'habitacion__tipo_habitacion')
        )

        ingresos = self._calcular_ingresos(reservas_rango)
        ocupacion = self._calcular_ocupacion(reservas_rango, habitaciones, total_dias, fecha_inicio, fecha_fin_exclusivo)
        demanda = self._calcular_demanda(reservas_rango, habitaciones)

        return {
            'rango': {
                'fecha_inicio': fecha_inicio.isoformat(),
                'fecha_fin': fecha_fin.isoformat(),
                'total_dias': total_dias,
            },
            'ingresos': ingresos,
            'ocupacion': ocupacion,
            'demanda': demanda,
        }

    def _calcular_ingresos(self, reservas_rango):
        proyectado = Decimal('0.00')
        real = Decimal('0.00')

        for reserva in reservas_rango:
            proyectado += reserva.precio_total
            if reserva.pagada:
                real += reserva.precio_total

        return {
            'proyectado': str(proyectado.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
            'real': str(real.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
        }

    def _calcular_ocupacion(self, reservas_rango, habitaciones, total_dias, fecha_inicio, fecha_fin_exclusivo):
        total_habitaciones = len(habitaciones)
        noches_posibles = total_habitaciones * total_dias

        if noches_posibles == 0:
            return {
                'general': {
                    'tasa': '0.0000',
                    'noches_ocupadas': 0,
                    'noches_posibles': 0,
                },
                'por_tipo': [],
            }

        noches_por_tipo = {}
        for habitacion in habitaciones:
            tipo_nombre = habitacion.tipo_habitacion.nombre
            if tipo_nombre not in noches_por_tipo:
                noches_por_tipo[tipo_nombre] = {
                    'total_habitaciones': 0,
                    'noches_ocupadas': 0,
                }
            noches_por_tipo[tipo_nombre]['total_habitaciones'] += 1

        noches_ocupadas_total = 0

        for reserva in reservas_rango:
            noches = self._calcular_noches_interseccion(reserva, fecha_inicio, fecha_fin_exclusivo)
            if noches <= 0:
                continue

            noches_ocupadas_total += noches

            tipo_nombre = reserva.habitacion.tipo_habitacion.nombre
            if tipo_nombre in noches_por_tipo:
                noches_por_tipo[tipo_nombre]['noches_ocupadas'] += noches

        tasa_general = (Decimal(noches_ocupadas_total) / Decimal(noches_posibles)).quantize(
            Decimal('0.0001'), rounding=ROUND_HALF_UP,
        )

        por_tipo = []
        for tipo_nombre, datos in sorted(noches_por_tipo.items()):
            noches_posibles_tipo = datos['total_habitaciones'] * total_dias
            tasa_tipo = Decimal('0.0000')
            if noches_posibles_tipo > 0:
                tasa_tipo = (Decimal(datos['noches_ocupadas']) / Decimal(noches_posibles_tipo)).quantize(
                    Decimal('0.0001'), rounding=ROUND_HALF_UP,
                )

            por_tipo.append({
                'tipo': tipo_nombre,
                'tasa': str(tasa_tipo),
                'noches_ocupadas': datos['noches_ocupadas'],
                'noches_posibles': noches_posibles_tipo,
            })

        return {
            'general': {
                'tasa': str(tasa_general),
                'noches_ocupadas': noches_ocupadas_total,
                'noches_posibles': noches_posibles,
            },
            'por_tipo': por_tipo,
        }

    def _calcular_noches_interseccion(self, reserva, fecha_inicio, fecha_fin_exclusivo):
        inicio_efectivo = max(reserva.fecha_entrada, fecha_inicio)
        fin_efectivo = min(reserva.fecha_salida, fecha_fin_exclusivo)
        return (fin_efectivo - inicio_efectivo).days

    def _calcular_demanda(self, reservas_rango, habitaciones):
        conteo_por_habitacion = {}
        for habitacion in habitaciones:
            conteo_por_habitacion[habitacion.id] = {
                'habitacion_id': habitacion.id,
                'numero': habitacion.numero,
                'total_reservas': 0,
            }

        for reserva in reservas_rango:
            hab_id = reserva.habitacion_id
            if hab_id in conteo_por_habitacion:
                conteo_por_habitacion[hab_id]['total_reservas'] += 1

        if not conteo_por_habitacion:
            return {
                'mayor': None,
                'menor': None,
            }

        lista = list(conteo_por_habitacion.values())
        mayor = max(lista, key=lambda x: x['total_reservas'])
        menor = min(lista, key=lambda x: x['total_reservas'])

        return {
            'mayor': mayor,
            'menor': menor,
        }
