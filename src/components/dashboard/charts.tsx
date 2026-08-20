"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/money";
import { LABELS, type Gender } from "@/types";

const AXIS_STYLE = {
  fontSize: 11,
  fill: "var(--viz-axis)",
} as const;

const SERIES = ["var(--viz-series-1)", "var(--viz-series-2)", "var(--viz-series-3)"];

function TooltipBox({ label, rows }: { label: string; rows: { text: string }[] }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{label}</p>
      {rows.map((row, index) => (
        <p key={index} className="tabular mt-0.5 text-muted-foreground">
          {row.text}
        </p>
      ))}
    </div>
  );
}

/**
 * Gender split. Identity lives on the category axis and every bar carries a
 * visible count, so the encoding never depends on colour alone.
 */
export function GenderChart({
  data,
}: {
  data: { gender: Gender; count: number }[];
}) {
  const total = data.reduce((sum, row) => sum + row.count, 0);
  const rows = data.map((row) => ({
    name: LABELS.gender[row.gender],
    count: row.count,
    share: total > 0 ? Math.round((row.count / total) * 100) : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={70}
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
        />
        <Tooltip
          cursor={{ fill: "var(--viz-grid)", opacity: 0.4 }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox
                label={String(payload[0].payload.name)}
                rows={[
                  {
                    text: `${payload[0].payload.count} people · ${payload[0].payload.share}%`,
                  },
                ]}
              />
            ) : null
          }
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22} isAnimationActive={false}
          label={{
            position: "right",
            fontSize: 11,
            fill: "var(--viz-axis)",
            formatter: (value: unknown) => String(value ?? ""),
          }}
        >
          {rows.map((row, index) => (
            <Cell key={row.name} fill={SERIES[index % SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** One measure across events — a single hue, so colour carries no extra meaning. */
export function ContributionsByEventChart({
  data,
}: {
  data: { eventId: string; name: string; totalMinor: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
        />
        <Tooltip
          cursor={{ fill: "var(--viz-grid)", opacity: 0.4 }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox
                label={String(payload[0].payload.name)}
                rows={[{ text: formatCurrency(Number(payload[0].value)) }]}
              />
            ) : null
          }
        />
        <Bar
          dataKey="totalMinor"
          fill="var(--viz-series-1)"
          radius={[0, 4, 4, 0]}
          barSize={18}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Twelve-month contribution trend — one series, so no legend is needed. */
export function MonthlyContributionsChart({
  data,
}: {
  data: { month: string; totalMinor: number }[];
}) {
  const rows = data.map((row) => {
    const [year, month] = row.month.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return {
      ...row,
      label: date.toLocaleDateString("en-GB", { month: "short" }),
      fullLabel: date.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id="contributionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--viz-series-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--viz-series-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_STYLE} />
        <YAxis
          width={54}
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
          tickFormatter={(value: number) =>
            value >= 100_000 ? `${Math.round(value / 100_000)}k` : String(value / 100)
          }
        />
        <Tooltip
          cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1, strokeDasharray: "3 3" }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox
                label={String(payload[0].payload.fullLabel)}
                rows={[{ text: formatCurrency(Number(payload[0].value)) }]}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="totalMinor"
          stroke="var(--viz-series-1)"
          strokeWidth={2}
          fill="url(#contributionFill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--viz-surface)" }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
