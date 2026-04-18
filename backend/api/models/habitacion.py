from django.db import models

from api.models.base import ModeloBase
from api.models.tipoHabitacion import TipoHabitacion


class Habitacion(ModeloBase):
    numero = models.CharField(max_length=10, unique=True)
    tipo_habitacion = models.ForeignKey(
        TipoHabitacion,
        on_delete=models.PROTECT,
        related_name='habitaciones',
    )
    piso = models.PositiveIntegerField()
    lista = models.BooleanField(default=True)
    nota = models.CharField(max_length=120, blank=True, default='')

    retenida_hasta = models.DateTimeField(null=True, blank=True)
    retenida_para = models.ForeignKey(
        'EntradaListaEspera',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='habitacion_retencion',
    )

    class Meta:
        ordering = ['numero']
        verbose_name = 'Habitacion'
        verbose_name_plural = 'Habitaciones'

    def __str__(self):
        return f"Habitacion {self.numero} - piso {self.piso}"
