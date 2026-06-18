from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    CASHIER = "CASHIER", "Cashier"
    MANAGER = "MANAGER", "Manager"
    AUDITOR = "AUDITOR", "Auditor"
    ADMIN = "ADMIN", "Admin"


class User(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CASHIER,
        db_default=UserRole.CASHIER,
    )

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"


class RoleChangeLog(models.Model):
    actor = models.ForeignKey(
        "users.User",
        on_delete=models.PROTECT,
        related_name="role_changes_made",
    )
    target_user = models.ForeignKey(
        "users.User",
        on_delete=models.PROTECT,
        related_name="role_changes_received",
    )
    previous_role = models.CharField(max_length=20, choices=UserRole.choices)
    new_role = models.CharField(max_length=20, choices=UserRole.choices)
    reason = models.TextField()
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]

    def __str__(self) -> str:
        return f"{self.actor_id} changed {self.target_user_id}: {self.previous_role}->{self.new_role}"
