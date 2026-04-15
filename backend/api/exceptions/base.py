class ErrorValidacionHotel(Exception):
    def __init__(self, mensaje, detalle=None):
        self.mensaje = mensaje
        self.detalle = detalle or {}
        super().__init__(mensaje)
