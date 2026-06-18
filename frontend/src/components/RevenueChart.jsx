import { useEffect, useRef } from "react";

const RevenueChart = ({ points = [] }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 24, right: 20, bottom: 36, left: 52 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    if (!points.length) {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No completed sales yet.", width / 2, height / 2);
      return;
    }

    const values = points.map((point) => Number(point.revenue) || 0);
    const maxValue = Math.max(...values, 1);
    const stepX = points.length > 1 ? chartWidth / (points.length - 1) : 0;

    const toX = (index) => padding.left + index * stepX;
    const toY = (value) => padding.top + chartHeight - (value / maxValue) * chartHeight;

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let grid = 0; grid <= 4; grid += 1) {
      const y = padding.top + (chartHeight / 4) * grid;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const labelValue = maxValue - (maxValue / 4) * grid;
      ctx.fillStyle = "#64748b";
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`ETB ${labelValue.toFixed(0)}`, padding.left - 8, y + 4);
    }

    ctx.beginPath();
    ctx.strokeStyle = "#1a56db";
    ctx.lineWidth = 2.5;
    points.forEach((point, index) => {
      const x = toX(index);
      const y = toY(Number(point.revenue) || 0);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    ctx.fillStyle = "#1a56db";
    points.forEach((point, index) => {
      const x = toX(index);
      const y = toY(Number(point.revenue) || 0);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#64748b";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    const labelIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1].filter(
      (value, index, array) => array.indexOf(value) === index
    );
    labelIndexes.forEach((index) => {
      const label = points[index].date.slice(5);
      ctx.fillText(label, toX(index), height - 12);
    });
  }, [points]);

  return (
    <div className="revenue-chart">
      <canvas ref={canvasRef} width={680} height={220} />
    </div>
  );
};

export default RevenueChart;
