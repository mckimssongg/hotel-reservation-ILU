from django.db import models

from api.models.base import ModeloBase
from api.models.reserva import Reserva


class PrecioNocheReserva(ModeloBase):
    reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name='precios_noche')
    fecha = models.DateField()
    precio_base = models.DecimalField(max_digits=10, decimal_places=2)
    recargo_fin_semana = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    descuento_estadia_larga = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    recargo_ocupacion = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    precio_final = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['fecha']
        verbose_name = 'Precio por noche'
        verbose_name_plural = 'Precios por noche'
        unique_together = [('reserva', 'fecha')]

    def __str__(self):
        return f"{self.reserva.codigo_reserva} - {self.fecha} - ${self.precio_final}"
