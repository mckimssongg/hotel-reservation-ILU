from api.viewsets.habitacion import HabitacionViewSet, TipoHabitacionViewSet
from api.viewsets.listaEspera import ListaEsperaViewSet
from api.viewsets.reserva import ReservaViewSet
from api.viewsets.stats import EstadisticasViewSet
from api.viewsets.user import UsuarioViewSet

__all__ = [
	'UsuarioViewSet',
	'TipoHabitacionViewSet',
	'HabitacionViewSet',
	'ReservaViewSet',
	'EstadisticasViewSet',
	'ListaEsperaViewSet',
]
