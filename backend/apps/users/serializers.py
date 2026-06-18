from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.users.models import RoleChangeLog, UserRole

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("username", "email", "password", "password_confirm")

    def validate(self, attrs: dict) -> dict:
        password = attrs["password"]
        password_confirm = attrs["password_confirm"]
        if password != password_confirm:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        validate_password(password=password)
        return attrs

    def create(self, validated_data: dict) -> User:
        validated_data.pop("password_confirm", None)
        validated_data.pop("role", None)
        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            role=UserRole.CASHIER,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class SmartPOSTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        return token

    def validate(self, attrs: dict) -> dict:
        username_or_email = attrs.get(self.username_field, "")
        if "@" in username_or_email:
            matched_user = User.objects.filter(email__iexact=username_or_email).first()
            if matched_user:
                attrs[self.username_field] = matched_user.username

        data = super().validate(attrs)
        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "role": self.user.role,
        }
        return data


class UpdateRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=UserRole.choices)
    reason = serializers.CharField()

    def save(self, **kwargs):
        actor = self.context["request"].user
        target_user = self.context["target_user"]
        new_role = self.validated_data["role"]
        reason = self.validated_data["reason"]
        previous_role = target_user.role

        if previous_role == new_role:
            return target_user

        with transaction.atomic():
            target_user.role = new_role
            target_user.save(update_fields=["role"])
            RoleChangeLog.objects.create(
                actor=actor,
                target_user=target_user,
                previous_role=previous_role,
                new_role=new_role,
                reason=reason,
            )
        return target_user


class RoleChangeLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)
    target_username = serializers.CharField(source="target_user.username", read_only=True)

    class Meta:
        model = RoleChangeLog
        fields = (
            "id",
            "actor",
            "actor_username",
            "target_user",
            "target_username",
            "previous_role",
            "new_role",
            "reason",
            "changed_at",
        )

