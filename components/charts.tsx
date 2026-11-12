"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Severity } from "@/lib/types";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#a32121",
  high: "#c2712f",
  medium: "#b09327",
  low: "#2f5d8a",
  informational: "#8b95a3",
};

const tooltipStyle = {
  border: "1px solid #e3e8ef",
  borderRadius: 6,
  fontSize: 12,
  color: "#1f2937",
  boxShadow: "0 4px 12px rgba(15,33,64,0.08)",
};

export function FindingsByTypeChart({ sqli, xss }: { sqli: number; xss: number }) {
  const data = [
    { name: "SQL Injection", findings: sqli, fill: "#2f5d8a" },
    { name: "XSS", findings: xss, fill: "#5b4382" },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#edf0f4" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5b6675" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5b6675" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="findings" radius={[4, 4, 0, 0]} maxBarSize={70}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SeverityChart({ counts }: { counts: Record<Severity, number> }) {
  const data = (Object.keys(counts) as Severity[])
    .map((severity) => ({ name: severity, value: counts[severity] }))
    .filter((entry) => entry.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-line text-xs text-muted">
        No findings recorded yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={48}
          outerRadius={76}
          paddingAngle={2}
          stroke="#ffffff"
          label={({ name, value }) => `${name} (${value})`}
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ScanActivityChart({ data }: { data: { date: string; scans: number; findings: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#edf0f4" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5b6675" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5b6675" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="scans" stroke="#2f5d8a" strokeWidth={2} dot={{ r: 2.5 }} name="Scans" />
        <Line type="monotone" dataKey="findings" stroke="#c2712f" strokeWidth={2} dot={{ r: 2.5 }} name="Findings" />
      </LineChart>
    </ResponsiveContainer>
  );
}
