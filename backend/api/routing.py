from django.urls import re_path

from api.consumers import ListaEsperaConsumer

websocket_urlpatterns = [
    re_path(r'^ws/lista-espera/(?P<entrada_id>\d+)/$', ListaEsperaConsumer.as_asgi()),
]
