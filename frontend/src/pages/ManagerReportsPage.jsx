import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import ReportPeriodFilter from "../components/ReportPeriodFilter";
import { useAuth } from "../context/AuthContext";
import { buildReportQuery, defaultReportFilter } from "../utils/reportPeriod";
import { formatMoney } from "../utils/formatMoney";

const ManagerReportsPage = () => {
  const { getValidAccessToken } = useAuth();
  const [filter, setFilter] = useState(defaultReportFilter);
  const [appliedFilter, setAppliedFilter] = useState(defaultReportFilter);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const queryPath = useMemo(() => `/manager/reports/${buildReportQuery(appliedFilter)}`, [appliedFilter]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient(queryPath, {}, getValidAccessToken());
      setData(response);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [getValidAccessToken, queryPath]);

  const applyFilter = useCallback((nextFilter) => {
    const resolved = nextFilter || filter;
    setFilter(resolved);
    setAppliedFilter(resolved);
  }, [filter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return (
    <section className="analytics-page">
      <header className="pos-header">
        <div>
          <p className="pos-eyebrow">Store Operations</p>
          <h1>Manager Reports</h1>
          {data?.label && <p className="pos-muted">Showing results for {data.label}</p>}
        </div>
      </header>

      <ReportPeriodFilter filter={filter} loading={loading} onApply={applyFilter} onChange={setFilter} />

      {error && <p className="error-text">{error}</p>}

      {data && (
        <>
          <div className="kpi-grid">
            <article className="kpi-card">
              <h3>Sales Count</h3>
              <p>{data.sales_count}</p>
            </article>
            <article className="kpi-card">
              <h3>Total Revenue</h3>
              <p>{formatMoney(data.sales_amount)}</p>
            </article>
            <article className="kpi-card">
              <h3>Active Cashiers</h3>
              <p>{data.active_cashiers}</p>
            </article>
          </div>

          <section className="audit-log-section">
            <h2>Payment Mix</h2>
            {!data.payment_breakdown.length && <p className="pos-muted">No sales in this period.</p>}
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Payment Method</th>
                  <th>Sales Count</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.payment_breakdown.map((row) => (
                  <tr key={row.payment_method}>
                    <td>{row.payment_method}</td>
                    <td>{row.sales_count}</td>
                    <td>{formatMoney(row.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="audit-log-section">
            <h2>Cashier Performance</h2>
            {!data.cashier_performance.length && <p className="pos-muted">No cashier activity in this period.</p>}
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Cashier</th>
                  <th>Sales Count</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.cashier_performance.map((row) => (
                  <tr key={row.cashier}>
                    <td>{row.cashier}</td>
                    <td>{row.sales_count}</td>
                    <td>{formatMoney(row.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <Link className="auth-secondary-btn manager-history-link" to="/admin/sales-history">
            Open full sales history
          </Link>
        </>
      )}
    </section>
  );
};

export default ManagerReportsPage;
