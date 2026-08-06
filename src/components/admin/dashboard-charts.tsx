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
  LabelList,
} from "recharts";

const PRIMARY = "#6366f1";
const BARS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"];

type EnrollPoint = { date: string; count: number };
type CoursePoint = { name: string; count: number };
type AxisTickProps = {
  y?: number;
  payload?: { value: string | number };
};

function niceStep(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, value)));
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function integerTicks(maxValue: number, targetTicks = 4) {
  const max = Math.max(0, Math.ceil(maxValue));
  if (max <= 1) return [0, 1];
  if (max <= targetTicks) {
    return Array.from({ length: max + 1 }, (_, i) => i);
  }

  const step = Math.max(1, niceStep(max / targetTicks));
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return ticks;
}

function numericAxisWidth(topTick: number) {
  return Math.max(36, String(topTick).length * 8 + 18);
}

function VisibleNumberTick({ y, payload }: AxisTickProps) {
  if (y === undefined || !payload) return null;

  return (
    <text
      x={4}
      y={y}
      fill="var(--muted-foreground)"
      fontSize={11}
      textAnchor="start"
      dominantBaseline="central"
    >
      {payload.value}
    </text>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="h-64 overflow-x-auto">{children}</div>
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
  const ticks = integerTicks(Math.max(0, ...data.map((item) => item.count)));
  const topTick = ticks[ticks.length - 1] ?? 1;
  const yAxisWidth = numericAxisWidth(topTick);

  return (
    <ChartCard title="Записи на курсы за 30 дней">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="enrollFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.35} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <YAxis
            allowDecimals={false}
            domain={[0, topTick]}
            ticks={ticks}
            tickLine={false}
            axisLine={false}
            width={yAxisWidth}
            tick={<VisibleNumberTick />}
          />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--muted-foreground)" }} />
          <Area type="monotone" dataKey="count" name="Записи" stroke={PRIMARY} strokeWidth={2} fill="url(#enrollFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopCoursesChart({ data }: { data: CoursePoint[] }) {
  const ticks = integerTicks(Math.max(0, ...data.map((item) => item.count)));
  const topTick = ticks[ticks.length - 1] ?? 1;

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
      <div className="h-full min-w-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 34, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              domain={[0, topTick]}
              ticks={ticks}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={82}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="count" name="Записи" radius={[0, 6, 6, 0]} barSize={22}>
              <LabelList dataKey="count" position="right" fill="var(--muted-foreground)" fontSize={12} />
              {data.map((_, i) => (
                <Cell key={i} fill={BARS[i % BARS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
