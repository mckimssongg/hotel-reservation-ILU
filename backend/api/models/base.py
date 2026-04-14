from django.db import models


class ModeloBase(models.Model):
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def __str__(self):
        return f"{self.__class__.__name__}({self.pk})"

    def delete(self, using=None, keep_parents=False):
        self.activo = False
        self.save(update_fields=['activo', 'actualizado_en'])
        return 1, {self.__class__.__name__: 1}

    def hard_delete(self, using=None, keep_parents=False):
        return super().delete(using=using, keep_parents=keep_parents)
         
