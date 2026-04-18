from django.core.validators import MinValueValidator
from django.db import models

from api.models.base import ModeloBase
from api.models.tipoHabitacion import TipoHabitacion


class EntradaListaEspera(ModeloBase):
    PENDIENTE = 'PENDIENTE'
    NOTIFICADA = 'NOTIFICADA'
    EXPIRADA = 'EXPIRADA'
    COMPLETADA = 'COMPLETADA'

    ESTADOS = (
        (PENDIENTE, 'Pendiente'),
        (NOTIFICADA, 'Notificada'),
        (EXPIRADA, 'Expirada'),
        (COMPLETADA, 'Completada'),
    )

    tipo_habitacion = models.ForeignKey(TipoHabitacion, on_delete=models.PROTECT, related_name='lista_espera')
    nombre_huesped = models.CharField(max_length=200)
    email_huesped = models.EmailField()
    telefono_huesped = models.CharField(max_length=30)
    fecha_entrada_preferida = models.DateField()
    fecha_salida_preferida = models.DateField()
    cantidad_huespedes = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    es_flexible = models.BooleanField(default=False)
    dias_flexibles = models.PositiveIntegerField(default=2)
    estado = models.CharField(max_length=20, choices=ESTADOS, default=PENDIENTE)
    notificada_en = models.DateTimeField(null=True, blank=True)
    retencion_hasta = models.DateTimeField(null=True, blank=True)

    habitacion_retenida = models.ForeignKey(
        'Habitacion',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='entradas_retenidas',
    )
    fecha_entrada_asignada = models.DateField(null=True, blank=True)
    fecha_salida_asignada = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['creado_en']
        verbose_name = 'Entrada lista de espera'
        verbose_name_plural = 'Entradas lista de espera'
        constraints = [
            models.CheckConstraint(
                condition=models.Q(fecha_salida_preferida__gt=models.F('fecha_entrada_preferida')),
                name='lista_espera_salida_mayor_entrada',
            ),
        ]

    def __str__(self):
        return f"Espera {self.nombre_huesped} - {self.tipo_habitacion.get_nombre_display()}"

    @property
    def noches_solicitadas(self):
        return (self.fecha_salida_preferida - self.fecha_entrada_preferida).days
