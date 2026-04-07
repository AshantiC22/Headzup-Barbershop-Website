from rest_framework import serializers
from .models import Appointment, Barber, Service, UserProfile
from django.contrib.auth.models import User


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'


class BarberSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model  = Barber
        fields = ["id", "name", "bio", "photo", "photo_url", "cashapp_tag"]

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.photo.url)
        import os
        backend = os.environ.get("BACKEND_URL", "").rstrip("/")
        return f"{backend}{obj.photo.url}" if backend else obj.photo.url


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = "__all__"


class AppointmentSerializer(serializers.ModelSerializer):
    service_name     = serializers.CharField(source="service.name",             read_only=True)
    service_price    = serializers.CharField(source="service.price",            read_only=True)
    service_duration = serializers.IntegerField(source="service.duration_minutes", read_only=True)
    barber_name      = serializers.CharField(source="barber.name",              read_only=True)

    class Meta:
        model  = Appointment
        fields = "__all__"
        read_only_fields = ["user", "service_name", "service_price", "service_duration", "barber_name"]


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=3, max_length=150)
    email    = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    phone    = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_username(self, value):
        value = value.strip()
        if " " in value:
            raise serializers.ValidationError("Username cannot contain spaces.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already in use.")
        return value

    def validate_phone(self, value):
        """Accept blank or a valid-ish phone number."""
        value = value.strip()
        if not value:
            return value
        # Strip formatting so we store digits only with +1 prefix
        import re
        digits = re.sub(r"\D", "", value)
        if len(digits) == 10:
            return f"+1{digits}"
        if len(digits) == 11 and digits.startswith("1"):
            return f"+{digits}"
        if len(digits) >= 10:
            return f"+{digits}"
        raise serializers.ValidationError("Enter a valid US phone number.")

    def create(self, validated_data):
        phone = validated_data.pop("phone", "")
        user  = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        # Save phone to UserProfile
        if phone:
            from .models import UserProfile
            profile, _ = UserProfile.objects.get_or_create(user=user, defaults={"name": user.username})
            profile.phone = phone
            profile.save(update_fields=["phone"])
        return user