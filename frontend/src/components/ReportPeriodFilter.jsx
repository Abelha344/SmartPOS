import {
  REPORT_INTERVALS,
  REPORT_PRESETS,
} from "../utils/reportPeriod";

const ReportPeriodFilter = ({ filter, onChange, onApply, loading = false }) => {
  const applyPreset = (preset) => {
    const next = preset.apply(filter);
    onChange(next);
    onApply(next);
  };

  return (
    <section className="report-period-filter">
      <div className="report-period-header">
        <div>
          <h2>Report period</h2>
          <p className="pos-muted">Pick a quick range or choose day, week, month, quarter, year, or a custom range.</p>
        </div>
        <button className="auth-primary-btn report-apply-btn" disabled={loading} onClick={() => onApply()} type="button">
          {loading ? "Loading…" : "Apply filter"}
        </button>
      </div>

      <div className="report-preset-row">
        <span className="report-filter-label">Quick range</span>
        <div className="report-preset-buttons">
          {REPORT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className="chip"
              onClick={() => applyPreset(preset)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="report-interval-row">
        <span className="report-filter-label">Interval</span>
        <div className="report-interval-tabs">
          {REPORT_INTERVALS.map((interval) => (
            <button
              key={interval.id}
              className={filter.period === interval.id ? "chip chip-active" : "chip"}
              onClick={() => onChange({ ...filter, period: interval.id })}
              type="button"
            >
              {interval.label}
            </button>
          ))}
        </div>
      </div>

      <div className="report-period-inputs">
        {filter.period === "day" && (
          <label className="auth-field">
            <span>Select day</span>
            <input
              onChange={(event) => onChange({ ...filter, date: event.target.value })}
              type="date"
              value={filter.date}
            />
          </label>
        )}

        {filter.period === "week" && (
          <label className="auth-field">
            <span>Week containing</span>
            <input
              onChange={(event) => onChange({ ...filter, date: event.target.value })}
              type="date"
              value={filter.date}
            />
          </label>
        )}

        {filter.period === "month" && (
          <label className="auth-field">
            <span>Select month</span>
            <input
              onChange={(event) => onChange({ ...filter, month: event.target.value })}
              type="month"
              value={filter.month}
            />
          </label>
        )}

        {filter.period === "quarter" && (
          <div className="sales-filter-row">
            <label className="auth-field">
              <span>Quarter</span>
              <select
                onChange={(event) => onChange({ ...filter, quarter: event.target.value })}
                value={filter.quarter}
              >
                <option value="1">Q1 (Jan – Mar)</option>
                <option value="2">Q2 (Apr – Jun)</option>
                <option value="3">Q3 (Jul – Sep)</option>
                <option value="4">Q4 (Oct – Dec)</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Year</span>
              <input
                max="2100"
                min="2020"
                onChange={(event) => onChange({ ...filter, year: event.target.value })}
                type="number"
                value={filter.year}
              />
            </label>
          </div>
        )}

        {filter.period === "year" && (
          <label className="auth-field">
            <span>Select year</span>
            <input
              max="2100"
              min="2020"
              onChange={(event) => onChange({ ...filter, year: event.target.value })}
              type="number"
              value={filter.year}
            />
          </label>
        )}

        {filter.period === "range" && (
          <div className="sales-filter-row">
            <label className="auth-field">
              <span>From</span>
              <input
                onChange={(event) => onChange({ ...filter, start: event.target.value })}
                type="date"
                value={filter.start}
              />
            </label>
            <label className="auth-field">
              <span>To</span>
              <input
                onChange={(event) => onChange({ ...filter, end: event.target.value })}
                type="date"
                value={filter.end}
              />
            </label>
          </div>
        )}
      </div>
    </section>
  );
};

export default ReportPeriodFilter;
