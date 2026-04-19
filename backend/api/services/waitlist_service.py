import logging
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone

from api.exceptions import ErrorValidacionHotel
from api.models import EntradaListaEspera, Habitacion, Reserva

logger = logging.getLogger(__name__)


class ServicioListaEspera:
    MINUTOS_RETENCION = 5

    def crear_entrada(self, datos):
        fecha_entrada = datos['fecha_entrada_preferida']
        fecha_salida = datos['fecha_salida_preferida']

        if fecha_salida <= fecha_entrada:
            raise ErrorValidacionHotel('La fecha de salida debe ser mayor a la fecha de entrada.')

        if fecha_entrada < timezone.now().date():
            raise ErrorValidacionHotel('La fecha de entrada no puede ser pasada.')

        tipo_habitacion = datos['tipo_habitacion']
        cantidad_huespedes = datos['cantidad_huespedes']

        if cantidad_huespedes > tipo_habitacion.capacidad:
            raise ErrorValidacionHotel('La cantidad de huespedes excede la capacidad del tipo de habitacion.')

        return EntradaListaEspera.objects.create(
            tipo_habitacion=tipo_habitacion,
            nombre_huesped=datos['nombre_huesped'],
            email_huesped=datos['email_huesped'],
            telefono_huesped=datos['telefono_huesped'],
            fecha_entrada_preferida=fecha_entrada,
            fecha_salida_preferida=fecha_salida,
            cantidad_huespedes=cantidad_huespedes,
            es_flexible=datos.get('es_flexible', False),
            dias_flexibles=datos.get('dias_flexibles', 2),
        )

    def evaluar_candidatos_tras_liberacion(self, reserva):
        habitacion = reserva.habitacion

        candidatos = (
            EntradaListaEspera.objects
            .filter(
                estado=EntradaListaEspera.PENDIENTE,
                tipo_habitacion=habitacion.tipo_habitacion,
                cantidad_huespedes__lte=habitacion.tipo_habitacion.capacidad,
                activo=True,
            )
            .order_by('creado_en')
        )

        for candidato in candidatos:
            resultado = self._buscar_rango_disponible(candidato, habitacion)
            if resultado is None:
                continue

            fecha_entrada_asignada, fecha_salida_asignada = resultado
            self._retener_habitacion(habitacion, candidato, fecha_entrada_asignada, fecha_salida_asignada)
            return candidato

        return None

    def consultar_estado_entrada(self, entrada_id):
        entrada = (
            EntradaListaEspera.objects
            .select_related('habitacion_retenida', 'habitacion_retenida__tipo_habitacion', 'tipo_habitacion')
            .filter(id=entrada_id, activo=True)
            .first()
        )

        if not entrada:
            raise ErrorValidacionHotel('La entrada de lista de espera no existe.')

        ahora = timezone.now()

        if entrada.estado == EntradaListaEspera.NOTIFICADA and entrada.retencion_hasta:
            if entrada.retencion_hasta <= ahora:
                self._expirar_retencion(entrada)

        tiene_retencion = (
            entrada.estado == EntradaListaEspera.NOTIFICADA
            and entrada.retencion_hasta is not None
            and entrada.retencion_hasta > ahora
        )

        respuesta = {
            'id': entrada.id,
            'estado': entrada.estado,
            'tipo_habitacion': entrada.tipo_habitacion.nombre,
            'fecha_entrada_preferida': entrada.fecha_entrada_preferida.isoformat(),
            'fecha_salida_preferida': entrada.fecha_salida_preferida.isoformat(),
            'es_flexible': entrada.es_flexible,
            'tiene_retencion': tiene_retencion,
        }

        if tiene_retencion:
            respuesta['retencion'] = {
                'habitacion_numero': entrada.habitacion_retenida.numero,
                'habitacion_id': entrada.habitacion_retenida.id,
                'fecha_entrada_asignada': entrada.fecha_entrada_asignada.isoformat(),
                'fecha_salida_asignada': entrada.fecha_salida_asignada.isoformat(),
                'expira_en': entrada.retencion_hasta.isoformat(),
            }

        return respuesta

    def confirmar_reserva_desde_espera(self, entrada_id, servicio_reserva):
        entrada = (
            EntradaListaEspera.objects
            .filter(id=entrada_id, activo=True)
            .first()
        )

        if not entrada:
            raise ErrorValidacionHotel('La entrada de lista de espera no existe.')

        if entrada.estado != EntradaListaEspera.NOTIFICADA:
            raise ErrorValidacionHotel('Esta entrada no tiene una habitacion retenida.')

        if not entrada.retencion_hasta or entrada.retencion_hasta <= timezone.now():
            self._expirar_retencion(entrada)
            raise ErrorValidacionHotel('La retencion ha expirado. La habitacion ya no esta reservada para ti.')

        if not entrada.habitacion_retenida_id:
            raise ErrorValidacionHotel('No hay habitacion retenida para esta entrada.')

        with transaction.atomic():
            entrada_bloqueada = (
                EntradaListaEspera.objects
                .select_for_update()
                .filter(id=entrada_id, estado=EntradaListaEspera.NOTIFICADA, activo=True)
                .first()
            )

            if not entrada_bloqueada:
                raise ErrorValidacionHotel('La entrada ya fue procesada por otro proceso.')

            if not entrada_bloqueada.retencion_hasta or entrada_bloqueada.retencion_hasta <= timezone.now():
                self._expirar_retencion(entrada_bloqueada)
                raise ErrorValidacionHotel('La retencion ha expirado. La habitacion ya no esta reservada para ti.')

            datos_reserva = {
                'habitacion_id': entrada_bloqueada.habitacion_retenida_id,
                'nombre_huesped': entrada_bloqueada.nombre_huesped,
                'email_huesped': entrada_bloqueada.email_huesped,
                'telefono_huesped': entrada_bloqueada.telefono_huesped,
                'fecha_entrada': entrada_bloqueada.fecha_entrada_asignada,
                'fecha_salida': entrada_bloqueada.fecha_salida_asignada,
                'cantidad_huespedes': entrada_bloqueada.cantidad_huespedes,
                'canal_reserva': 'lista_espera',
            }

            reserva = servicio_reserva.crear_reserva(datos_reserva)

            entrada_bloqueada.estado = EntradaListaEspera.COMPLETADA
            entrada_bloqueada.save(update_fields=['estado', 'actualizado_en'])

            habitacion = Habitacion.objects.get(id=entrada_bloqueada.habitacion_retenida_id)
            self._limpiar_retencion_habitacion(habitacion)

            return reserva

    def _buscar_rango_disponible(self, entrada, habitacion):
        noches = entrada.noches_solicitadas

        if not entrada.es_flexible:
            if self._habitacion_disponible_rango(habitacion, entrada.fecha_entrada_preferida, entrada.fecha_salida_preferida):
                return entrada.fecha_entrada_preferida, entrada.fecha_salida_preferida
            return None

        dias_flex = entrada.dias_flexibles
        for desplazamiento in range(-dias_flex, dias_flex + 1):
            fecha_entrada_candidata = entrada.fecha_entrada_preferida + timedelta(days=desplazamiento)
            fecha_salida_candidata = fecha_entrada_candidata + timedelta(days=noches)

            if fecha_entrada_candidata < timezone.now().date():
                continue

            if self._habitacion_disponible_rango(habitacion, fecha_entrada_candidata, fecha_salida_candidata):
                return fecha_entrada_candidata, fecha_salida_candidata

        return None

    def _habitacion_disponible_rango(self, habitacion, fecha_entrada, fecha_salida):
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
        return not hay_traslape

    def _retener_habitacion(self, habitacion, entrada, fecha_entrada, fecha_salida):
        ahora = timezone.now()
        expira = ahora + timedelta(minutes=self.MINUTOS_RETENCION)

        habitacion.retenida_hasta = expira
        habitacion.retenida_para = entrada
        habitacion.save(update_fields=['retenida_hasta', 'retenida_para', 'actualizado_en'])

        entrada.estado = EntradaListaEspera.NOTIFICADA
        entrada.notificada_en = ahora
        entrada.retencion_hasta = expira
        entrada.habitacion_retenida = habitacion
        entrada.fecha_entrada_asignada = fecha_entrada
        entrada.fecha_salida_asignada = fecha_salida
        entrada.save(update_fields=[
            'estado', 'notificada_en', 'retencion_hasta',
            'habitacion_retenida', 'fecha_entrada_asignada',
            'fecha_salida_asignada', 'actualizado_en',
        ])

        self._notificar_ws(entrada.id, {
            'tipo': 'retencion_asignada',
            'entrada_id': entrada.id,
            'habitacion_numero': habitacion.numero,
            'habitacion_id': habitacion.id,
            'fecha_entrada_asignada': fecha_entrada.isoformat(),
            'fecha_salida_asignada': fecha_salida.isoformat(),
            'expira_en': expira.isoformat(),
        })

    def _expirar_retencion(self, entrada):
        entrada.estado = EntradaListaEspera.EXPIRADA
        entrada.save(update_fields=['estado', 'actualizado_en'])

        if entrada.habitacion_retenida:
            self._limpiar_retencion_habitacion(entrada.habitacion_retenida)

        self._notificar_ws(entrada.id, {
            'tipo': 'retencion_expirada',
            'entrada_id': entrada.id,
        })

    def _limpiar_retencion_habitacion(self, habitacion):
        habitacion.retenida_hasta = None
        habitacion.retenida_para = None
        habitacion.save(update_fields=['retenida_hasta', 'retenida_para', 'actualizado_en'])

    def _notificar_ws(self, entrada_id, datos):
        try:
            channel_layer = get_channel_layer()
            if channel_layer is None:
                return
            nombre_grupo = f'espera_{entrada_id}'
            async_to_sync(channel_layer.group_send)(nombre_grupo, {
                'type': 'notificacion_retencion' if datos.get('tipo') == 'retencion_asignada' else 'notificacion_expiracion',
                'datos': datos,
            })
        except Exception:
            logger.exception('Error al enviar notificacion WebSocket para entrada %s', entrada_id)
