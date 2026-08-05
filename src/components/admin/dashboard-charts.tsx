"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

const PRIMARY = "#6366f1";
const BARS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"];

type EnrollPoint = { date: string; count: number };
type CoursePoint = { name: string; count: number };

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 13,
  color: "var(--foreground)",
};

export function EnrollmentsChart({ data }: { data: EnrollPoint[] }) {
  return (
    <ChartCard title="Записи на курсы за 30 дней">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="enrollFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.35} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={30} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--muted-foreground)" }} />
          <Area type="monotone" dataKey="count" name="Записи" stroke={PRIMARY} strokeWidth={2} fill="url(#enrollFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopCoursesChart({ data }: { data: CoursePoint[] }) {
  if (data.length === 0) {
    return (
      <ChartCard title="Популярные курсы">
        <div className="grid h-full place-items-center text-sm text-muted-foreground">
          Пока нет данных
        </div>
      </ChartCard>
    );
  }
  return (
    <ChartCard title="Топ курсов по записям">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="count" name="Записи" radius={[0, 6, 6, 0]} barSize={22}>
            {data.map((_, i) => (
              <Cell key={i} fill={BARS[i % BARS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
