from django.contrib import admin
from api.models import EntradaListaEspera, Habitacion, PrecioNocheReserva, Reserva, TipoHabitacion

admin.site.register(TipoHabitacion)
admin.site.register(Habitacion)
admin.site.register(Reserva)
admin.site.register(PrecioNocheReserva)
admin.site.register(EntradaListaEspera)
