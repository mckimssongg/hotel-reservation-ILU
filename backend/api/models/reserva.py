from django.core.validators import MinValueValidator
from django.db import models

from api.models.habitacion import Habitacion
from api.models.base import ModeloBase


class Reserva(ModeloBase):
    PENDIENTE = 'PENDIENTE'
    CONFIRMADA = 'CONFIRMADA'
    REGISTRADA_ENTRADA = 'REGISTRADA_ENTRADA'
    REGISTRADA_SALIDA = 'REGISTRADA_SALIDA'
    CANCELADA = 'CANCELADA'

    ESTADOS = (
        (PENDIENTE, 'Pendiente'),
        (CONFIRMADA, 'Confirmada'),
        (REGISTRADA_ENTRADA, 'Entrada registrada'),
        (REGISTRADA_SALIDA, 'Salida registrada'),
        (CANCELADA, 'Cancelada'),
    )

    codigo_reserva = models.CharField(max_length=12, unique=True, db_index=True)
    habitacion = models.ForeignKey(Habitacion, on_delete=models.PROTECT, related_name='reservas')
    nombre_huesped = models.CharField(max_length=200)
    email_huesped = models.EmailField()
    telefono_huesped = models.CharField(max_length=30)
    fecha_entrada = models.DateField()
    fecha_salida = models.DateField()
    cantidad_huespedes = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    estado = models.CharField(max_length=25, choices=ESTADOS, default=PENDIENTE)
    precio_total = models.DecimalField(max_digits=10, decimal_places=2)
    canal_reserva = models.CharField(max_length=20, default='web')
    pagada = models.BooleanField(default=False)
    notas = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'Reserva'
        verbose_name_plural = 'Reservas'
        constraints = [
            models.CheckConstraint(
                condition=models.Q(fecha_salida__gt=models.F('fecha_entrada')),
                name='reserva_salida_mayor_entrada',
            ),
            models.UniqueConstraint(
                fields=['habitacion', 'fecha_entrada', 'fecha_salida'],
                name='reserva_unica_habitacion_fechas',
                condition=~models.Q(estado='CANCELADA'),
            ),
        ]

    def __str__(self):
        return f"Reserva {self.codigo_reserva} - {self.nombre_huesped}"

    @property
    def noches(self):
        return (self.fecha_salida - self.fecha_entrada).days
