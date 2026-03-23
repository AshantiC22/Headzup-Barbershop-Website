from rest_framework import serializers
from .models import Appointment, Barber, Service, UserProfile
from django.contrib.auth.models import User


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'


class BarberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Barber
        fields = "__all__"


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = "__all__"


class AppointmentSerializer(serializers.ModelSerializer):
    service_name  = serializers.CharField(source="service.name",  read_only=True)
    service_price = serializers.CharField(source="service.price", read_only=True)
    barber_name   = serializers.CharField(source="barber.name",   read_only=True)

    class Meta:
        model  = Appointment
        fields = "__all__"
        read_only_fields = ["user", "service_name", "service_price", "barber_name"]


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=3, max_length=150)
    email    = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)

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

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )