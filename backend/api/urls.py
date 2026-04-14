from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token

from api import viewsets

router = DefaultRouter()
router.register('usuarios', viewsets.UsuarioViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('api/token', obtain_auth_token, name='api-token'),
    path('api-auth/', include('rest_framework.urls')),
]
