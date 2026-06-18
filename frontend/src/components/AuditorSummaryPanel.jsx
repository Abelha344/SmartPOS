import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

const AuditorSummaryPanel = () => {
  const { getValidAccessToken } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await apiClient("/admin/audit-summary/", {}, getValidAccessToken());
        setSummary(response);
      } catch (requestError) {
        setError(requestError.message);
      }
    };
    loadSummary();
  }, [getValidAccessToken]);

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  if (!summary) {
    return <p className="pos-muted">Loading audit summary…</p>;
  }

  return (
    <section className="audit-log-section auditor-summary-panel">
      <h2>Auditor Overview</h2>
      <p className="pos-muted">Read-only compliance snapshot for financial and security review.</p>
      <div className="kpi-grid">
        <article className="kpi-card">
          <h3>Sales Today</h3>
          <p>{summary.sales_today_count}</p>
        </article>
        <article className="kpi-card">
          <h3>Revenue Today</h3>
          <p>ETB {Number(summary.sales_today_amount).toLocaleString("en-ET", { minimumFractionDigits: 2 })}</p>
        </article>
        <article className="kpi-card">
          <h3>Role Changes</h3>
          <p>{summary.role_change_count}</p>
        </article>
        <article className="kpi-card">
          <h3>Blocked Duplicates</h3>
          <p>{summary.blocked_duplicate_count}</p>
        </article>
      </div>
    </section>
  );
};

export default AuditorSummaryPanel;
