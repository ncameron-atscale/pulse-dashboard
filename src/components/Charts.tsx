"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea, Scatter, Area, BarChart, Bar } from "recharts";
import { Card } from "./ui/card";

export interface ChartData {
  x: string;
  y: number;
}

interface ChartProps {
  title: string;
  data: ChartData[];
  xLabel?: string;
  yLabel?: string;
  type?: "line";
  axisMargin?: number;
  centerTitle?: boolean;
  yDomain?: [number, number];
  monthlyOnly?: boolean;
  weeklyOnly?: boolean;
  outlierSigma?: number;
  showFourSigmaLine?: boolean;
}

// Helper: get quarterly ticks and format x-axis
function getQuarterlyTicks(data: ChartData[]) {
  // Extract unique quarters (e.g., '01', '04', '07', '10')
  const months = Array.from(new Set(data.map(d => {
    const m = d.x.split("-")[1];
    return m;
  })));
  // Only keep quarters
  return months.filter(m => ["01", "04", "07", "10"].includes(m));
}

// Helper: compute mean and 4-sigma bands, and mark outliers
function getBands(data: ChartData[]) {
  if (!data.length) return { mean: 0, upper: [], lower: [], outliers: [] };
  const ys = data.map(d => d.y);
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const std = Math.sqrt(ys.reduce((a, b) => a + (b - mean) ** 2, 0) / ys.length);
  const upperVal = mean + 4 * std;
  const lowerVal = mean - 4 * std;
  const upper = data.map(d => ({ x: d.x, y: upperVal }));
  const lower = data.map(d => ({ x: d.x, y: lowerVal }));
  const outliers = data.filter(d => d.y > upperVal || d.y < lowerVal);
  return { mean, upper, lower, outliers };
}

function getMonthlyScatter(data: ChartData[]) {
  // Group by month (YYYY-MM)
  const byMonth: Record<string, ChartData[]> = {};
  data.forEach(d => {
    const month = d.x.slice(0, 7); // 'YYYY-MM'
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(d);
  });
  // For each month, average y
  return Object.entries(byMonth).map(([month, arr]) => ({
    x: month + "-01", // Use first day of month for x
    y: arr.reduce((a, b) => a + b.y, 0) / arr.length
  }));
}

function getMonthlyLine(data: ChartData[]) {
  // Group by month (YYYY-MM)
  const byMonth: Record<string, ChartData[]> = {};
  data.forEach(d => {
    const month = d.x.slice(0, 7); // 'YYYY-MM'
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(d);
  });
  // For each month, average y
  return Object.entries(byMonth).map(([month, arr]) => ({
    x: month + "-01", // Use first day of month for x
    y: arr.reduce((a, b) => a + b.y, 0) / arr.length
  }));
}

function getOutliers(data: ChartData[], sigma: number) {
  if (!data.length) return [];
  const ys = data.map(d => d.y);
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const std = Math.sqrt(ys.reduce((a, b) => a + (b - mean) ** 2, 0) / ys.length);
  const upperVal = mean + sigma * std;
  return data.filter(d => d.y > upperVal).map(o => ({ x: o.x, y: o.y }));
}

function getWeeklyLine(data: ChartData[]) {
  // Group by week (YYYY-WW)
  const byWeek: Record<string, ChartData[]> = {};
  data.forEach(d => {
    const date = new Date(d.x);
    // Get ISO week number
    const year = date.getFullYear();
    const firstJan = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + firstJan.getDay() + 1) / 7);
    const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
    if (!byWeek[weekKey]) byWeek[weekKey] = [];
    byWeek[weekKey].push(d);
  });
  // For each week, average y
  return Object.entries(byWeek).map(([week, arr]) => ({
    x: week,
    y: arr.reduce((a, b) => a + b.y, 0) / arr.length
  }));
}

function getFourSigmaLine(data: ChartData[]) {
  if (!data.length) return [];
  const ys = data.map(d => d.y);
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const std = Math.sqrt(ys.reduce((a, b) => a + (b - mean) ** 2, 0) / ys.length);
  const upperVal = mean + 4 * std;
  return data.map(d => ({ x: d.x, y: upperVal }));
}

function getFiveSigmaLine(data: ChartData[]) {
  if (!data.length) return [];
  const ys = data.map(d => d.y);
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const std = Math.sqrt(ys.reduce((a, b) => a + (b - mean) ** 2, 0) / ys.length);
  const upperVal = mean + 5 * std;
  return data.map(d => ({ x: d.x, y: upperVal }));
}

export function KPIChart({ title, data, xLabel, yLabel, axisMargin = 40, centerTitle = false, yDomain, monthlyOnly = false, weeklyOnly = false, outlierSigma }: ChartProps) {
  const quarterlyTicks = getQuarterlyTicks(data);
  let chartData = data;
  let lineData = data;
  if (weeklyOnly) {
    lineData = getWeeklyLine(data);
  } else if (monthlyOnly) {
    lineData = getMonthlyLine(data);
  }
  const monthlyScatter = (!monthlyOnly && !weeklyOnly) ? getMonthlyScatter(data) : [];
  const yVals = lineData.map(d => d.y);
  const yMin = yDomain ? yDomain[0] : Math.min(...yVals);
  const yMax = yDomain ? yDomain[1] : Math.max(...yVals);
  const xVals = lineData.map(d => d.x);
  const xMin = xVals.length ? xVals[0] : undefined;
  const xMax = xVals.length ? xVals[xVals.length - 1] : undefined;
  return (
    <Card className="h-64 p-2 flex flex-col bg-muted/40 border border-border w-full">
      <span className={centerTitle ? "text-base font-bold mb-1 text-center" : "text-xs text-muted-foreground mb-1"} style={centerTitle ? { fontSize: '1.25rem' } : {}}>{title}</span>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={lineData} margin={{ top: 8, right: axisMargin, left: axisMargin, bottom: 32 }}>
          <defs>
            <linearGradient id="successRateGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            domain={xMin && xMax ? [xMin, xMax] : undefined}
            tickFormatter={weeklyOnly ? v => {
              const match = typeof v === 'string' && v.match(/W(\d{2})/);
              return match ? `W${match[1]}` : v;
            } : v => v.split("-")[1]}
            label={undefined}
            minTickGap={20}
            interval={0}
            tick={false}
          />
          <YAxis
            domain={yLabel === 'SuccessRate (%)' ? [0, 100] : [yMin, yMax]}
            ticks={yLabel === 'SuccessRate (%)' ? [0, 20, 40, 60, 80, 100] : undefined}
            label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", dx: -axisMargin/2, style: { textAnchor: 'middle' } } : undefined}
            tick={{ fontSize: 12 }}
            tickFormatter={yLabel === 'SuccessRate (%)' ? (v => typeof v === 'number' ? `${v.toFixed(2)}%` : v) : (v => typeof v === 'number' ? v.toFixed(2) : v)}
          />
          <Tooltip />
          {/* No legend */}
          {/* Gradient area for SuccessRate over time */}
          {weeklyOnly && (
            <Area type="monotone" dataKey="y" stroke={"none"} fill="url(#successRateGradient)" />
          )}
          {/* Main line */}
          <Line type="monotone" dataKey="y" stroke="#06b6d4" dot={false} strokeWidth={2} legendType="none" />
          {/* Monthly scatter points for non-monthlyOnly/weeklyOnly charts */}
          {!monthlyOnly && !weeklyOnly && <Scatter data={monthlyScatter} fill="#f59e42" shape="circle" legendType="none" />}
          {/* 5-sigma upper band only for all charts */}
          <Line type="monotone" data={getFiveSigmaLine(lineData)} dataKey="y" stroke="#8884d8" dot={false} strokeDasharray="6 6" strokeWidth={2} legendType="none" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

// Horizontal bar chart for top 10 users
export function TopUsersBarChart({ title, data, xLabel, yLabel, axisMargin = 40, centerTitle = false }: ChartProps) {
  // Sort and get top 10 users
  const topUsers = [...data].sort((a, b) => b.y - a.y).slice(0, 10);
  return (
    <Card className="h-[500px] p-2 flex flex-col bg-muted/40 border border-border w-full">
      <span className={centerTitle ? "text-base font-bold mb-1 text-center" : "text-xs text-muted-foreground mb-1"} style={centerTitle ? { fontSize: '1.25rem' } : {}}>{title}</span>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={topUsers}
          layout="vertical"
          margin={{ top: 16, right: 16, left: 16, bottom: 16 }}
          barCategoryGap={0}
          barSize={32}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" label={xLabel ? { value: xLabel, position: "insideBottom", offset: 0, dy: 24, style: { textAnchor: 'middle' } } : undefined} tickFormatter={v => typeof v === 'number' ? v.toFixed(2) : v} />
          <YAxis type="category" dataKey="x" label={undefined} tick={{ fontSize: 12 }} width={200} tickFormatter={v => typeof v === 'string' ? v.slice(-5) : v} />
          <Tooltip />
          <Bar dataKey="y" fill="#06b6d4" radius={[8, 8, 8, 8]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
} 