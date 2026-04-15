class ErrorConflictoReserva(Exception):
    def __init__(self, mensaje='Esa habitacion ya se aparto en esas fechas.'):
        self.mensaje = mensaje
        super().__init__(mensaje)


class HabitacionNoDisponibleError(Exception):
    def __init__(self, mensaje='Esa habitacion no esta disponible.'):
        self.mensaje = mensaje
        super().__init__(mensaje)


class ErrorHabitacionNoDisponible(HabitacionNoDisponibleError):
    pass


class ErrorConcurrenciaReserva(Exception):
    def __init__(self, mensaje='La habitacion se reservo mientras confirmabas.', detalle=None):
        self.mensaje = mensaje
        self.detalle = detalle or {}
        super().__init__(mensaje)
