"""Views de la app usuarios: registro docente, perfil y logout JWT."""

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario
from .permissions import EsAdmin
from .serializers import (
    CustomTokenObtainPairSerializer,
    PerfilUpdateSerializer,
    RegistroDocenteSerializer,
    UsuarioSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login que devuelve `access`, `refresh` y `usuario` (con su rol).
    Ahorra al frontend una llamada extra a /perfil/ tras el login.
    """

    serializer_class = CustomTokenObtainPairSerializer


class RegistroDocenteView(generics.CreateAPIView):
    """
    Registro autónomo de docentes (RF01, RN01).
    Endpoint público. Tras crear el usuario devuelve tokens JWT + datos del docente
    para que el frontend pueda iniciar sesión sin un POST extra.
    """

    queryset = Usuario.objects.all()
    serializer_class = RegistroDocenteSerializer
    permission_classes = [AllowAny]

    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()

        refresh = RefreshToken.for_user(usuario)
        refresh['rol'] = usuario.rol
        refresh['username'] = usuario.username

        return Response(
            {
                'usuario': UsuarioSerializer(usuario).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class PerfilView(generics.RetrieveUpdateAPIView):
    """Perfil del usuario autenticado (GET) y configuración de correo SMTP (PATCH)."""

    permission_classes = [IsAuthenticated]

    def get_object(self) -> Usuario:
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return PerfilUpdateSerializer
        return UsuarioSerializer

    def patch(self, request: Request, *args, **kwargs) -> Response:
        if request.user.rol not in (Usuario.Rol.DOCENTE, Usuario.Rol.ADMIN):
            return Response(
                {'detail': 'Solo docentes pueden configurar el correo de invitaciones.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = PerfilUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UsuarioSerializer(request.user).data)


@api_view(['GET'])
@permission_classes([EsAdmin])
def admin_listar_usuarios(request: Request) -> Response:
    """Lista TODOS los usuarios para el panel administrador.

    Útil para diagnosticar / corregir roles cuando un docente quedó mal
    registrado (caso típico: entró por código de estudiante por error y
    su `rol` quedó en ESTUDIANTE).
    Filtros opcionales por query string: `?rol=DOCENTE` o `?q=texto`.
    """
    qs = Usuario.objects.all().order_by('-date_joined')
    rol = request.query_params.get('rol')
    if rol:
        qs = qs.filter(rol=rol.upper())
    q = (request.query_params.get('q') or '').strip()
    if q:
        from django.db.models import Q
        qs = qs.filter(
            Q(username__icontains=q)
            | Q(email__icontains=q)
            | Q(first_name__icontains=q)
            | Q(last_name__icontains=q),
        )
    return Response(UsuarioSerializer(qs[:200], many=True).data)


@api_view(['PATCH'])
@permission_classes([EsAdmin])
def admin_cambiar_rol(request: Request, user_id: int) -> Response:
    """Cambia el rol de un usuario. Solo accesible para administradores.

    Body: `{ "rol": "DOCENTE" }` (o ADMIN / ESTUDIANTE)
    """
    nuevo_rol = (request.data.get('rol') or '').upper().strip()
    if nuevo_rol not in dict(Usuario.Rol.choices):
        return Response(
            {'detail': f'Rol inválido. Debe ser uno de: {list(dict(Usuario.Rol.choices).keys())}'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        usuario = Usuario.objects.get(pk=user_id)
    except Usuario.DoesNotExist:
        return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    if usuario.id == request.user.id and nuevo_rol != Usuario.Rol.ADMIN:
        return Response(
            {'detail': 'No puedes quitarte a ti mismo el rol ADMIN.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    rol_previo = usuario.rol
    usuario.rol = nuevo_rol
    usuario.save(update_fields=['rol'])
    return Response({
        'usuario': UsuarioSerializer(usuario).data,
        'rol_previo': rol_previo,
        'rol_nuevo': usuario.rol,
    })


class LogoutView(APIView):
    """
    Cierra sesión añadiendo el refresh token a la blacklist (RN16, RN26 indirectamente).
    El frontend debe llamar este endpoint y borrar localStorage en paralelo.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        refresh = request.data.get('refresh')
        if not refresh:
            return Response(
                {'detail': 'Se requiere el campo "refresh".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh)
            token.blacklist()
        except TokenError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)
