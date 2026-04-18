import json
import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class ListaEsperaConsumer(AsyncJsonWebsocketConsumer):
    """
    Conexiones:
        ws://host/ws/lista-espera/{entrada_id}/?token=xyz   (staff con JWT)
        ws://host/ws/lista-espera/{entrada_id}/              (huesped sin auth)

    El huesped ya conoce su entrada_id porque lo recibe al crear la entrada via post 
    y mismo nivel de acceso que el endpoint get /api/lista-espera/{id}/estado/ (AllowAny).
    """

    async def connect(self):
        self.entrada_id = self.scope['url_route']['kwargs'].get('entrada_id')

        if not self.entrada_id:
            await self.close(code=4000)
            return

        token = self._extraer_token()
        if token:
            usuario = await self._validar_token_jwt(token)
            if not usuario:
                await self.close(code=4001)
                return
            self.usuario = usuario
        else:
            self.usuario = None

        existe = await self._entrada_existe(self.entrada_id)
        if not existe:
            await self.close(code=4004)
            return

        self.nombre_grupo = f'espera_{self.entrada_id}'
        await self.channel_layer.group_add(self.nombre_grupo, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'nombre_grupo'):
            await self.channel_layer.group_discard(self.nombre_grupo, self.channel_name)

    async def receive_json(self, content, **kwargs):
        pass

    async def notificacion_retencion(self, evento):
        await self.send_json(evento['datos'])

    async def notificacion_expiracion(self, evento):
        await self.send_json(evento['datos'])

    def _extraer_token(self):
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        if not query_string:
            return None

        for param in query_string.split('&'):
            if param.startswith('token='):
                return param[6:]

        return None

    @database_sync_to_async
    def _validar_token_jwt(self, token_raw):
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from django.contrib.auth import get_user_model

            token = AccessToken(token_raw)
            user_id = token['user_id']
            Usuario = get_user_model()
            return Usuario.objects.filter(id=user_id, is_active=True).first()
        except Exception:
            logger.warning('WebSocket: token JWT invalido o expirado.')
            return None

    @database_sync_to_async
    def _entrada_existe(self, entrada_id):
        from api.models import EntradaListaEspera

        try:
            return EntradaListaEspera.objects.filter(id=entrada_id, activo=True).exists()
        except (ValueError, TypeError):
            return False
