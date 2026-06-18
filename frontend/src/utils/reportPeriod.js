export const todayIso = () => new Date().toISOString().slice(0, 10);

export const currentMonthIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export const currentYear = () => String(new Date().getFullYear());

export const currentQuarter = () => String(Math.floor(new Date().getMonth() / 3) + 1);

export const defaultReportFilter = () => ({
  period: "month",
  date: todayIso(),
  month: currentMonthIso(),
  year: currentYear(),
  quarter: currentQuarter(),
  start: todayIso(),
  end: todayIso(),
});

export const REPORT_INTERVALS = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
  { id: "range", label: "Custom range" },
];

export const REPORT_PRESETS = [
  {
    id: "today",
    label: "Today",
    apply: (filter) => ({ ...filter, period: "day", date: todayIso() }),
  },
  {
    id: "this_week",
    label: "This week",
    apply: (filter) => ({ ...filter, period: "week", date: todayIso() }),
  },
  {
    id: "this_month",
    label: "This month",
    apply: (filter) => ({ ...filter, period: "month", month: currentMonthIso() }),
  },
  {
    id: "this_quarter",
    label: "This quarter",
    apply: (filter) => ({
      ...filter,
      period: "quarter",
      year: currentYear(),
      quarter: currentQuarter(),
    }),
  },
  {
    id: "this_year",
    label: "This year",
    apply: (filter) => ({ ...filter, period: "year", year: currentYear() }),
  },
];

export const buildReportQuery = (filter) => {
  const params = new URLSearchParams();
  params.set("period", filter.period);

  if (filter.period === "day" || filter.period === "week") {
    params.set("date", filter.date);
  } else if (filter.period === "month") {
    params.set("month", filter.month);
  } else if (filter.period === "quarter") {
    params.set("year", filter.year);
    params.set("quarter", filter.quarter);
  } else if (filter.period === "year") {
    params.set("year", filter.year);
  } else if (filter.period === "range") {
    params.set("start", filter.start);
    params.set("end", filter.end);
  }

  return `?${params.toString()}`;
};
