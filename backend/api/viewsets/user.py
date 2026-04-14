from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from api.serializers import SerializadorCambioClaveUsuario, SerializadorLecturaUsuario, SerializadorUsuario


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(is_active=True).order_by('id')

    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('username', 'first_name', 'last_name', 'email')
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering_fields = ('id', 'username', 'first_name', 'last_name', 'email')

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve', 'mi_perfil'):
            return SerializadorLecturaUsuario
        if self.action == 'cambiar_clave':
            return SerializadorCambioClaveUsuario
        return SerializadorUsuario

    def get_permissions(self):
        if self.action in ('create', 'iniciar_sesion', 'cerrar_sesion', 'refrescar_token'):
            clases_permisos = [AllowAny]
        else:
            clases_permisos = [IsAuthenticated]
        return [permiso() for permiso in clases_permisos]

    def _crear_tokens_usuario(self, usuario):
        refresh = RefreshToken.for_user(usuario)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }

    def _armar_respuesta_tokens(self, tokens):
        return {
            'tokens': tokens,
            'access': tokens['access'],
            'refresh': tokens['refresh'],
        }

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            serializador = self.get_serializer(data=request.data)
            serializador.is_valid(raise_exception=True)
            usuario = serializador.save()
            tokens = self._crear_tokens_usuario(usuario)
            respuesta = {
                'usuario': SerializadorLecturaUsuario(usuario).data,
                **self._armar_respuesta_tokens(tokens),
            }
            return Response(respuesta, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        parcial = kwargs.pop('partial', False)
        usuario = self.get_object()
        serializador = self.get_serializer(usuario, data=request.data, partial=parcial)
        serializador.is_valid(raise_exception=True)
        usuario = serializador.save()
        return Response(SerializadorLecturaUsuario(usuario).data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        usuario = self.get_object()
        usuario.is_active = False
        usuario.save(update_fields=['is_active'])
        return Response({'mensaje': 'Usuario desactivado.'}, status=status.HTTP_200_OK)

    @action(methods=["get"], detail=False, url_path='mi-perfil')
    def mi_perfil(self, request, *args, **kwargs):
        serializador = SerializadorLecturaUsuario(request.user)
        return Response(serializador.data, status=status.HTTP_200_OK)

    @action(methods=['post'], detail=False, url_path='cambiar-clave')
    def cambiar_clave(self, request, *args, **kwargs):
        serializador = self.get_serializer(data=request.data)
        serializador.is_valid(raise_exception=True)
        usuario = request.user
        if not usuario.check_password(serializador.validated_data['clave_actual']):
            return Response({'detalle': 'La clave actual es incorrecta.'}, status=status.HTTP_400_BAD_REQUEST)
        usuario.set_password(serializador.validated_data['clave_nueva'])
        usuario.save()
        tokens = self._crear_tokens_usuario(usuario)
        return Response(
            {
                'mensaje': 'Clave actualizada.',
                **self._armar_respuesta_tokens(tokens),
            },
            status=status.HTTP_200_OK,
        )

    @action(methods=["post"], detail=False, url_path='iniciar-sesion')
    def iniciar_sesion(self, request, *args, **kwargs):
        usuario_login = request.data.get('usuario') or request.data.get('username')
        clave = request.data.get('clave') or request.data.get('password')
        if not usuario_login or not clave:
            return Response({'detalle': 'usuario y clave son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        usuario = authenticate(request, username=usuario_login, password=clave)
        if not usuario or not usuario.is_active:
            return Response({'detalle': 'Credenciales invalidas.'}, status=status.HTTP_400_BAD_REQUEST)

        serializador = SerializadorLecturaUsuario(usuario)
        tokens = self._crear_tokens_usuario(usuario)
        return Response(
            {
                'usuario': serializador.data,
                **self._armar_respuesta_tokens(tokens),
            },
            status=status.HTTP_200_OK,
        )

    @action(methods=["post"], detail=False, url_path='cerrar-sesion')
    def cerrar_sesion(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detalle': 'refresh es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response({'detalle': 'refresh invalido o expirado.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(methods=['post'], detail=False, url_path='refrescar-token')
    def refrescar_token(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detalle': 'refresh es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token_actual = RefreshToken(refresh_token)
            user_id = token_actual.get('user_id')
            usuario = User.objects.filter(id=user_id, is_active=True).first()
            if not usuario:
                return Response({'detalle': 'Usuario no valido.'}, status=status.HTTP_400_BAD_REQUEST)

            token_actual.blacklist()
            tokens_nuevos = self._crear_tokens_usuario(usuario)
            return Response(self._armar_respuesta_tokens(tokens_nuevos), status=status.HTTP_200_OK)
        except TokenError:
            return Response({'detalle': 'refresh invalido o expirado.'}, status=status.HTTP_400_BAD_REQUEST)
