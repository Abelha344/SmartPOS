from django.urls import path

from apps.users.views import (
    AdminReportView,
    AdminUserListView,
    AuditorSummaryView,
    LoginView,
    ManagerReportView,
    RegisterView,
    RoleChangeLogView,
    SalesHistoryView,
    UpdateUserRoleView,
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("admin/users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("admin/users/<int:user_id>/update-role/", UpdateUserRoleView.as_view(), name="update-user-role"),
    path("admin/reports/", AdminReportView.as_view(), name="admin-reports"),
    path("manager/reports/", ManagerReportView.as_view(), name="manager-reports"),
    path("admin/sales-history/", SalesHistoryView.as_view(), name="sales-history"),
    path("admin/audit-summary/", AuditorSummaryView.as_view(), name="audit-summary"),
    path("admin/role-change-logs/", RoleChangeLogView.as_view(), name="role-change-logs"),
]

