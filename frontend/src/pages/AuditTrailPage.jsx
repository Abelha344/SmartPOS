import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api/client";
import AuditorSummaryPanel from "../components/AuditorSummaryPanel";
import RoleManagementPanel from "../components/RoleManagementPanel";
import { useAuth } from "../context/AuthContext";

const AuditTrailPage = () => {
  const { getValidAccessToken, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    const response = await apiClient("/admin/role-change-logs/", {}, getValidAccessToken());
    setLogs(response);
  }, [getValidAccessToken]);

  useEffect(() => {
    const run = async () => {
      try {
        await loadLogs();
      } catch (requestError) {
        setError(requestError.message);
      }
    };
    run();
  }, [loadLogs]);

  return (
    <section className="audit-page">
      <header className="pos-header">
        <div>
          <p className="pos-eyebrow">Security Operations</p>
          <h1>Security Audit Trail</h1>
        </div>
      </header>
      {error && <p className="error-text">{error}</p>}
      {user?.role === "AUDITOR" && <AuditorSummaryPanel />}
      <RoleManagementPanel onRoleChanged={loadLogs} />
      <section className="audit-log-section">
        <h2>Role Change History</h2>
        {!logs.length && <p className="pos-muted">No role changes recorded yet.</p>}
        <table className="audit-table">
          <thead>
            <tr>
              <th>Actor</th>
              <th>Target</th>
              <th>Previous Role</th>
              <th>New Role</th>
              <th>Reason</th>
              <th>Changed At</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.actor_username}</td>
                <td>{entry.target_username}</td>
                <td>{entry.previous_role}</td>
                <td>{entry.new_role}</td>
                <td>{entry.reason}</td>
                <td>{new Date(entry.changed_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
};

export default AuditTrailPage;
