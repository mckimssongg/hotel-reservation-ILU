from calendar import monthrange
from datetime import date, timedelta

from django.db.models import Prefetch

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

    def obtener_matriz_calendario(
        self,
        mes: int,
        anio: int,
        tipo_habitacion_id: int | None = None,
        piso: int | None = None,
    ):
        inicio_mes, fin_mes, fin_mes_exclusivo = self._obtener_limites_mes(mes, anio)

        habitaciones = self._obtener_habitaciones_calendario(
            inicio_mes=inicio_mes,
            fin_mes_exclusivo=fin_mes_exclusivo,
            tipo_habitacion_id=tipo_habitacion_id,
            piso=piso,
        )

        dias_mes = self._obtener_dias_mes(inicio_mes, fin_mes)

        filas_habitaciones = []
        for habitacion in habitaciones:
            reservas_habitacion = getattr(habitacion, 'reservas_calendario_mes', [])
            mapa_dias_reservados, mapa_checkin, mapa_checkout = self._armar_mapas_reserva(
                reservas_habitacion,
                inicio_mes,
                fin_mes_exclusivo,
            )

            celdas = []
            for fecha_dia in dias_mes:
                estado_celda = self._resolver_estado_celda(
                    fecha_dia,
                    mapa_dias_reservados,
                    mapa_checkin,
                    mapa_checkout,
                )
                reservas_celda = self._obtener_reservas_celda(
                    fecha_dia,
                    mapa_dias_reservados,
                    mapa_checkin,
                    mapa_checkout,
                )
                celdas.append(
                    {
                        'dia': fecha_dia.day,
                        'fecha': fecha_dia.isoformat(),
                        'estado': estado_celda,
                        'reservas': reservas_celda,
                    }
                )

            barras_reserva = []
            for reserva in reservas_habitacion:
                barra = self._construir_barra_reserva(reserva, inicio_mes, fin_mes_exclusivo)
                if barra:
                    barras_reserva.append(barra)

            filas_habitaciones.append(
                {
                    'id': habitacion.id,
                    'numero': habitacion.numero,
                    'piso': habitacion.piso,
                    'tipo_habitacion': {
                        'id': habitacion.tipo_habitacion.id,
                        'nombre': habitacion.tipo_habitacion.nombre,
                        'capacidad': habitacion.tipo_habitacion.capacidad,
                        'precio_base': str(habitacion.tipo_habitacion.precio_base),
                    },
                    'celdas': celdas,
                    'barras_reserva': barras_reserva,
                }
            )

        return {
            'mes': mes,
            'anio': anio,
            'fecha_inicio': inicio_mes.isoformat(),
            'fecha_fin': fin_mes.isoformat(),
            'total_dias': len(dias_mes),
            'dias': [fecha.isoformat() for fecha in dias_mes],
            'habitaciones': filas_habitaciones,
        }

    def _obtener_limites_mes(self, mes: int, anio: int):
        total_dias = monthrange(anio, mes)[1]
        inicio_mes = date(anio, mes, 1)
        fin_mes = date(anio, mes, total_dias)
        fin_mes_exclusivo = fin_mes + timedelta(days=1)
        return inicio_mes, fin_mes, fin_mes_exclusivo

    def _obtener_habitaciones_calendario(
        self,
        inicio_mes: date,
        fin_mes_exclusivo: date,
        tipo_habitacion_id: int | None,
        piso: int | None,
    ):
        habitaciones = Habitacion.objects.select_related('tipo_habitacion').filter(activo=True, lista=True)

        if tipo_habitacion_id:
            tipo_habitacion = TipoHabitacion.objects.filter(id=tipo_habitacion_id, activo=True).first()
            if not tipo_habitacion:
                raise ErrorValidacionHotel('El tipo de habitacion no existe o no esta activo.')
            habitaciones = habitaciones.filter(tipo_habitacion_id=tipo_habitacion_id)

        if piso:
            habitaciones = habitaciones.filter(piso=piso)

        reservas_mes = (
            Reserva.objects
            .filter(
                activo=True,
                fecha_entrada__lt=fin_mes_exclusivo,
                fecha_salida__gt=inicio_mes,
            )
            .exclude(estado=Reserva.CANCELADA)
            .only(
                'id',
                'habitacion_id',
                'codigo_reserva',
                'nombre_huesped',
                'estado',
                'fecha_entrada',
                'fecha_salida',
            )
            .order_by('fecha_entrada', 'id')
        )

        return (
            habitaciones
            .prefetch_related(Prefetch('reservas', queryset=reservas_mes, to_attr='reservas_calendario_mes'))
            .order_by('numero')
        )

    def _obtener_dias_mes(self, inicio_mes: date, fin_mes: date):
        dias_mes = []
        fecha_cursor = inicio_mes
        while fecha_cursor <= fin_mes:
            dias_mes.append(fecha_cursor)
            fecha_cursor += timedelta(days=1)
        return dias_mes

    def _armar_mapas_reserva(self, reservas_habitacion, inicio_mes: date, fin_mes_exclusivo: date):
        mapa_dias_reservados = {}
        mapa_checkin = {}
        mapa_checkout = {}

        for reserva in reservas_habitacion:
            inicio_visible = max(reserva.fecha_entrada, inicio_mes)
            fin_visible_exclusivo = min(reserva.fecha_salida, fin_mes_exclusivo)

            fecha_cursor = inicio_visible
            while fecha_cursor < fin_visible_exclusivo:
                mapa_dias_reservados.setdefault(fecha_cursor, []).append(reserva)
                fecha_cursor += timedelta(days=1)

            if inicio_mes <= reserva.fecha_entrada < fin_mes_exclusivo:
                mapa_checkin.setdefault(reserva.fecha_entrada, []).append(reserva)

            if inicio_mes <= reserva.fecha_salida < fin_mes_exclusivo:
                mapa_checkout.setdefault(reserva.fecha_salida, []).append(reserva)

        return mapa_dias_reservados, mapa_checkin, mapa_checkout

    def _resolver_estado_celda(self, fecha_dia: date, mapa_dias_reservados, mapa_checkin, mapa_checkout):
        tiene_checkin = bool(mapa_checkin.get(fecha_dia))
        tiene_checkout = bool(mapa_checkout.get(fecha_dia))

        if tiene_checkin and tiene_checkout:
            return 'transicion'
        if tiene_checkin:
            return 'check-in_hoy'
        if tiene_checkout:
            return 'check-out_hoy'
        if mapa_dias_reservados.get(fecha_dia):
            return 'reservada'
        return 'libre'

    def _obtener_reservas_celda(self, fecha_dia: date, mapa_dias_reservados, mapa_checkin, mapa_checkout):
        reservas_unicas = {}

        for reserva in mapa_dias_reservados.get(fecha_dia, []):
            reservas_unicas[reserva.id] = reserva

        for reserva in mapa_checkin.get(fecha_dia, []):
            reservas_unicas[reserva.id] = reserva

        for reserva in mapa_checkout.get(fecha_dia, []):
            reservas_unicas[reserva.id] = reserva

        reservas_serializadas = [self._serializar_reserva_calendario(reserva) for reserva in reservas_unicas.values()]
        reservas_serializadas.sort(key=lambda item: (item['fecha_entrada'], item['id']))
        return reservas_serializadas

    def _serializar_reserva_calendario(self, reserva: Reserva):
        return {
            'id': reserva.id,
            'codigo_reserva': reserva.codigo_reserva,
            'nombre_huesped': reserva.nombre_huesped,
            'estado': reserva.estado,
            'fecha_entrada': reserva.fecha_entrada.isoformat(),
            'fecha_salida': reserva.fecha_salida.isoformat(),
        }

    def _construir_barra_reserva(self, reserva: Reserva, inicio_mes: date, fin_mes_exclusivo: date):
        inicio_visible = max(reserva.fecha_entrada, inicio_mes)
        fin_visible_exclusivo = min(reserva.fecha_salida, fin_mes_exclusivo)

        if inicio_visible >= fin_visible_exclusivo:
            return None

        fin_visible = fin_visible_exclusivo - timedelta(days=1)
        barra = self._serializar_reserva_calendario(reserva)
        barra.update(
            {
                'fecha_inicio_visible': inicio_visible.isoformat(),
                'fecha_fin_visible': fin_visible.isoformat(),
                'columna_inicio': (inicio_visible - inicio_mes).days + 1,
                'columna_fin': (fin_visible - inicio_mes).days + 1,
            }
        )
        return barra
