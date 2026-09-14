"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { AnalyticsSummary } from "@/lib/analytics";

const PALETTE = ["#18E7F2", "#3182FF", "#725CFF", "#FF5C67", "#22E6A8", "#FFB020"];

const tooltipStyle = {
  backgroundColor: "#0B1628",
  border: "1px solid rgba(24,231,242,0.25)",
  borderRadius: 8,
  fontSize: 12,
  color: "#e6edf7",
};

export function RunsByDayChart({ data }: { data: AnalyticsSummary["runsByDay"] }) {
  if (data.length === 0) {
    return <EmptyState />;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: -20, right: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(24,231,242,0.06)" }} />
        <Bar dataKey="count" name="Total Runs" fill="#3182FF" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="failed" name="Failed" fill="#FF5C67" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ErrorTypesChart({ data }: { data: AnalyticsSummary["errorTypes"] }) {
  if (data.length === 0) return <EmptyState />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="type" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function StatusBreakdownChart({ data }: { data: AnalyticsSummary["statusBreakdown"] }) {
  if (data.length === 0) return <EmptyState />;
  const colorFor = (name: string) => (name === "Completed" ? "#22E6A8" : name === "Failed" ? "#FF5C67" : "#18E7F2");
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((d, i) => (
            <Cell key={i} fill={colorFor(d.name)} stroke="none" />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyState() {
  return <div className="flex h-[240px] items-center justify-center text-sm text-white/30">데이터가 충분하지 않습니다.</div>;
}
