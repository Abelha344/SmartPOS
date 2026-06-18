from __future__ import annotations

from rest_framework.permissions import BasePermission


class IsSystemAdmin(BasePermission):
    message = "Only system admins may access this endpoint."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.role == "ADMIN")


class IsFinancialAuditor(BasePermission):
    message = "Only financial auditors may access this endpoint."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.role == "AUDITOR")


class IsAdminOrAuditor(BasePermission):
    message = "Only admins and auditors may access this endpoint."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {"ADMIN", "AUDITOR"}
        )


class IsManager(BasePermission):
    message = "Only managers may access this endpoint."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.role == "MANAGER")


class IsAdminOrManager(BasePermission):
    message = "Only admins and managers may access this endpoint."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {"ADMIN", "MANAGER"}
        )


class IsAdminAuditorOrManager(BasePermission):
    message = "Only admins, auditors, and managers may access this endpoint."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {"ADMIN", "AUDITOR", "MANAGER"}
        )
