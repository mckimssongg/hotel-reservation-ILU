from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView

from api.viewsets import (
    EstadisticasViewSet,
    HabitacionViewSet,
    ListaEsperaViewSet,
    ReservaViewSet,
    TipoHabitacionViewSet,
    UsuarioViewSet,
)

router = DefaultRouter()
router.register('usuarios', UsuarioViewSet, basename='usuarios')
router.register('tipos-habitacion', TipoHabitacionViewSet, basename='tipos-habitacion')
router.register('habitaciones', HabitacionViewSet, basename='habitaciones')
router.register('reservas', ReservaViewSet, basename='reservas')
router.register('estadisticas', EstadisticasViewSet, basename='estadisticas')
router.register('lista-espera', ListaEsperaViewSet, basename='lista-espera')

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token-obtener-par'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refrescar'),
    path('token/verify/', TokenVerifyView.as_view(), name='token-verificar'),
    path('api-auth/', include('rest_framework.urls')),
]
