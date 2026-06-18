from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.users.models import UserRole

User = get_user_model()


class Command(BaseCommand):
    help = "Create or update the default admin user."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin")
        parser.add_argument("--email", default="admin@gmail.com")
        parser.add_argument("--password", default="admin@123")

    def handle(self, *args, **options) -> None:
        username = options["username"]
        email = options["email"]
        password = options["password"]

        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email, "role": UserRole.ADMIN},
        )
        user.email = email
        user.role = UserRole.ADMIN
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        action = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f"Admin {action}: {username} ({email})"))
