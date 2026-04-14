from api.viewsets.habitacion import HabitacionViewSet, TipoHabitacionViewSet
from api.viewsets.reserva import ReservaViewSet
from api.viewsets.user import UsuarioViewSet

__all__ = [
	'UsuarioViewSet',
	'TipoHabitacionViewSet',
	'HabitacionViewSet',
	'ReservaViewSet',
]
