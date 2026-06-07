"""Serializers de la app usuarios: registro, perfil y JWT custom con datos de usuario."""

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Usuario


class UsuarioSerializer(serializers.ModelSerializer):
    """Representación pública del usuario autenticado (perfil)."""

    nombre_completo = serializers.SerializerMethodField()
    correo_smtp_configurado = serializers.BooleanField(read_only=True)

    class Meta:
        model = Usuario
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'nombre_completo',
            'rol',
            'date_joined',
            'correo_smtp_configurado',
        )
        read_only_fields = ('id', 'rol', 'date_joined', 'nombre_completo', 'correo_smtp_configurado')

    def get_nombre_completo(self, obj: Usuario) -> str:
        full = obj.get_full_name().strip()
        return full or obj.username


class RegistroDocenteSerializer(serializers.ModelSerializer):
    """
    Serializer para el registro autónomo de docentes (RF01, RN01).
    El campo `rol` se fuerza a DOCENTE y no es editable.
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        style={'input_type': 'password'},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
    )
    correo_smtp_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text='Contraseña de aplicación Gmail (misma cuenta). Si no se envía, se usa la contraseña de acceso.',
    )

    class Meta:
        model = Usuario
        fields = (
            'username',
            'email',
            'first_name',
            'last_name',
            'password',
            'password_confirm',
            'correo_smtp_password',
        )
        extra_kwargs = {
            'email': {'required': True, 'allow_blank': False},
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
        }

    def validate_email(self, value: str) -> str:
        if Usuario.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con este correo electrónico.')
        return value.lower()

    def validate(self, attrs: dict) -> dict:
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden.'})
        try:
            validate_password(attrs['password'])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return attrs

    def create(self, validated_data: dict) -> Usuario:
        password = validated_data.pop('password')
        smtp_password = validated_data.pop('correo_smtp_password', '') or password
        usuario = Usuario(rol=Usuario.Rol.DOCENTE, **validated_data)
        usuario.set_password(password)
        usuario.correo_smtp_password = smtp_password
        usuario.save()
        return usuario


class PerfilUpdateSerializer(serializers.ModelSerializer):
    """Actualización parcial del perfil docente (clave SMTP para invitaciones)."""

    correo_smtp_password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        style={'input_type': 'password'},
    )

    class Meta:
        model = Usuario
        fields = ('correo_smtp_password',)

    def update(self, instance: Usuario, validated_data: dict) -> Usuario:
        instance.correo_smtp_password = validated_data['correo_smtp_password']
        instance.save(update_fields=['correo_smtp_password'])
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Override del serializer de SimpleJWT para incluir el rol como claim del token
    y devolver los datos del usuario junto con los tokens.
    """

    @classmethod
    def get_token(cls, user: Usuario):
        token = super().get_token(user)
        token['rol'] = user.rol
        token['username'] = user.username
        return token

    def validate(self, attrs: dict) -> dict:
        data = super().validate(attrs)
        # self.user es seteado por SimpleJWT durante validate()
        data['usuario'] = UsuarioSerializer(self.user).data
        return data
