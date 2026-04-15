from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import RangeOperators
from django.contrib.postgres.operations import BtreeGistExtension
from django.db import migrations
from django.db.models import F, Func, Q


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        BtreeGistExtension(),
        migrations.AddConstraint(
            model_name='reserva',
            constraint=ExclusionConstraint(
                name='reserva_no_traslape_habitacion',
                expressions=[
                    (
                        Func(
                            F('fecha_entrada'),
                            F('fecha_salida'),
                            function='DATERANGE',
                            template="%(function)s(%(expressions)s, '[)')",
                        ),
                        RangeOperators.OVERLAPS,
                    ),
                    ('habitacion', RangeOperators.EQUAL),
                ],
                condition=Q(activo=True) & ~Q(estado='CANCELADA'),
            ),
        ),
    ]
