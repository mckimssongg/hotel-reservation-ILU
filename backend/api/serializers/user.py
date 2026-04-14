from django.contrib.auth.models import User
from rest_framework import serializers


class SerializadorUsuario(serializers.ModelSerializer):
    usuario = serializers.CharField(source='username')
    nombre = serializers.CharField(source='first_name', required=False, allow_blank=True)
    apellido = serializers.CharField(source='last_name', required=False, allow_blank=True)
    correo = serializers.EmailField(source='email', required=False, allow_blank=True)
    clave = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = (
            'id',
            'usuario',
            'nombre',
            'apellido',
            'correo',
            'clave',
        )
        read_only_fields = ('id',)

    def validate_usuario(self, valor):
        consulta = User.objects.filter(username=valor)
        if self.instance:
            consulta = consulta.exclude(id=self.instance.id)
        if consulta.exists():
            raise serializers.ValidationError('Ese usuario ya existe.')
        return valor

    def validate_correo(self, valor):
        if not valor:
            return valor
        correo_limpio = valor.strip().lower()
        consulta = User.objects.filter(email__iexact=correo_limpio)
        if self.instance:
            consulta = consulta.exclude(id=self.instance.id)
        if consulta.exists():
            raise serializers.ValidationError('Ese correo ya existe.')
        return correo_limpio

    def validate(self, atributos):
        if self.instance is None and not atributos.get('clave'):
            raise serializers.ValidationError({'clave': 'La clave es requerida.'})
        return atributos

    def create(self, datos_validados):
        clave = datos_validados.pop('clave')
        return User.objects.create_user(password=clave, **datos_validados)

    def update(self, instancia, datos_validados):
        clave = datos_validados.pop('clave', None)
        for campo in ('username', 'first_name', 'last_name', 'email'):
            if campo in datos_validados:
                setattr(instancia, campo, datos_validados[campo])
        if clave:
            instancia.set_password(clave)
        instancia.save()
        return instancia


class SerializadorCambioClaveUsuario(serializers.Serializer):
    clave_actual = serializers.CharField(required=True)
    clave_nueva = serializers.CharField(required=True, min_length=8)


class SerializadorLecturaUsuario(serializers.ModelSerializer):
    usuario = serializers.CharField(source='username')
    nombre = serializers.CharField(source='first_name')
    apellido = serializers.CharField(source='last_name')
    correo = serializers.EmailField(source='email')
    es_admin = serializers.BooleanField(source='is_superuser')
    es_staff = serializers.BooleanField(source='is_staff')
    rol = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'usuario',
            'nombre',
            'apellido',
            'correo',
            'es_admin',
            'es_staff',
            'rol',
        )

    def get_rol(self, usuario):
        if usuario.is_superuser:
            return 'admin'
        if usuario.is_staff:
            return 'recepcionista'
        return 'huesped'