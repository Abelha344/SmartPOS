import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

const ROLES = ["CASHIER", "MANAGER", "AUDITOR", "ADMIN"];

const RoleManagementPanel = ({ onRoleChanged }) => {
  const { getValidAccessToken, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submittingId, setSubmittingId] = useState(null);

  const loadUsers = useCallback(async () => {
    const token = getValidAccessToken();
    const response = await apiClient("/admin/users/", {}, token);
    setUsers(response);
    setDrafts(
      Object.fromEntries(
        response.map((entry) => [entry.id, { role: entry.role, reason: "" }])
      )
    );
  }, [getValidAccessToken]);

  useEffect(() => {
    if (user?.role !== "ADMIN") {
      return;
    }
    const run = async () => {
      try {
        await loadUsers();
      } catch (requestError) {
        setError(requestError.message);
      }
    };
    run();
  }, [loadUsers, user?.role]);

  const updateDraft = (userId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const submitRoleChange = async (targetUser) => {
    setError("");
    setSuccess("");
    const draft = drafts[targetUser.id];
    if (!draft?.reason?.trim()) {
      setError("A reason is required for every role change.");
      return;
    }
    if (draft.role === targetUser.role) {
      setError("Choose a different role before submitting.");
      return;
    }

    setSubmittingId(targetUser.id);
    try {
      const token = getValidAccessToken();
      await apiClient(
        `/admin/users/${targetUser.id}/update-role/`,
        {
          method: "POST",
          body: JSON.stringify({
            role: draft.role,
            reason: draft.reason.trim(),
          }),
        },
        token
      );
      setSuccess(`Updated ${targetUser.username} to ${draft.role}.`);
      await loadUsers();
      if (onRoleChanged) {
        await onRoleChanged();
      }
      setDrafts((prev) => ({
        ...prev,
        [targetUser.id]: { role: draft.role, reason: "" },
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmittingId(null);
    }
  };

  if (user?.role !== "ADMIN") {
    return null;
  }

  return (
    <section className="role-management-panel">
      <header>
        <h2>Role Management</h2>
        <p className="pos-muted">Update staff roles here. Every change is recorded in the audit trail below.</p>
      </header>
      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}
      <table className="audit-table role-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Current Role</th>
            <th>New Role</th>
            <th>Reason</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.username}</td>
              <td>{entry.email || "—"}</td>
              <td>{entry.role}</td>
              <td>
                <select
                  value={drafts[entry.id]?.role || entry.role}
                  onChange={(event) => updateDraft(entry.id, "role", event.target.value)}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  placeholder="Why is this role changing?"
                  value={drafts[entry.id]?.reason || ""}
                  onChange={(event) => updateDraft(entry.id, "reason", event.target.value)}
                />
              </td>
              <td>
                <button
                  className="secondary-button"
                  disabled={submittingId === entry.id || entry.id === user.id}
                  onClick={() => submitRoleChange(entry)}
                  type="button"
                >
                  {submittingId === entry.id ? "Saving…" : "Update"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!users.length && <p className="pos-muted">No users found.</p>}
    </section>
  );
};

export default RoleManagementPanel;
