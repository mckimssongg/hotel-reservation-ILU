from django.db import models

from api.models.base import ModeloBase


class TipoHabitacion(ModeloBase):
    ESTANDAR = 'ESTANDAR'
    SUITE = 'SUITE'
    PREMIUM = 'PREMIUM'

    TIPOS_HABITACION = (
        (ESTANDAR, 'Estandar'),
        (SUITE, 'Suite'),
        (PREMIUM, 'Premium'),
    )

    nombre = models.CharField(max_length=50, choices=TIPOS_HABITACION, unique=True)
    descripcion = models.TextField(blank=True, default='')
    capacidad = models.PositiveIntegerField()
    precio_base = models.DecimalField(max_digits=10, decimal_places=2)
    info_camas = models.CharField(max_length=60, blank=True, default='')

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Tipo cuarto'
        verbose_name_plural = 'Tipos cuarto'

    def __str__(self):
        return f"{self.get_nombre_display()} ({self.capacidad} pax)"
