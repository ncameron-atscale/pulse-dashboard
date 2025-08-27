"use client";
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card } from "./ui/card";

interface ChartData {
  x: string;
  y: number;
}

interface StreamChartProps {
  title: string;
  data: ChartData[];
  xLabel?: string;
  yLabel?: string;
  centerTitle?: boolean;
  areaOnly?: boolean;
  yDomain?: [number, number];
  showSigma?: boolean;
  dayOfWeekTicks?: boolean;
}

interface EnhancedBarChartProps {
  title: string;
  data: ChartData[];
  xLabel?: string;
  yLabel?: string;
  centerTitle?: boolean;
}

export function StreamChart({ title, data, xLabel, yLabel, centerTitle = false, areaOnly = false, yDomain, showSigma = true, dayOfWeekTicks = false }: StreamChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);

    const render = () => {
      const node = svgRef.current!;
      const containerWidth = node.clientWidth || 800;
      const margin = { top: 20, right: 24, bottom: 34, left: 56 };
      const width = Math.max(320, containerWidth) - margin.left - margin.right;
      const height = 320;

      // preprocess: parse, sort by time, and average duplicate timestamps
      const parsed = data
        .map((d) => ({ date: new Date(d.x), y: Number(d.y) || 0 }))
        .filter((d) => !isNaN(d.date.getTime()));
      parsed.sort((a, b) => a.date.getTime() - b.date.getTime());
      const byTs = new Map<number, { sum: number; count: number }>();
      parsed.forEach((d) => {
        const t = d.date.getTime();
        const stat = byTs.get(t) || { sum: 0, count: 0 };
        stat.sum += d.y;
        stat.count += 1;
        byTs.set(t, stat);
      });
      const series = Array.from(byTs.entries()).map(([t, s]) => ({ date: new Date(t), y: s.sum / s.count }));

      svg.selectAll("*").remove();
      svg.attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

      const x = d3
        .scaleTime()
        .domain(d3.extent(series, (d) => d.date) as [Date, Date])
        .range([0, width])
        .clamp(true);

      const autoMax = (d3.max(series, (d) => d.y) as number) || 1;
      const y = d3
        .scaleLinear()
        .domain(yDomain ? yDomain : [0, autoMax])
        .nice()
        .range([height, 0])
        .clamp(true);

      const curve = d3.curveMonotoneX;

      const area = d3
        .area<{ date: Date; y: number }>()
        .x((d) => x(d.date))
        .y0(height)
        .y1((d) => y(d.y))
        .curve(curve);

      const line = d3
        .line<{ date: Date; y: number }>()
        .x((d) => x(d.date))
        .y((d) => y(d.y))
        .curve(curve);

      const defs = svg.append("defs");
      const gradient = defs
        .append("linearGradient")
        .attr("id", "streamGradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");

      gradient.append("stop").attr("offset", "0%").attr("stop-color", "#06b6d4").attr("stop-opacity", 0.6);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", "#06b6d4").attr("stop-opacity", 0.08);

      // clip to plotting area to avoid overflow/overlap
      defs
        .append("clipPath")
        .attr("id", "plot-clip")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height);

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`).attr("clip-path", "url(#plot-clip)");

      // background grids (outside clip to show full width)
      const gx = svg.append("g").attr("transform", `translate(${margin.left},${margin.top + height})`);
      gx
        .call(d3.axisBottom(x).tickSize(-height).tickFormat(() => ""))
        .selectAll("line")
        .attr("stroke", "#374151")
        .attr("stroke-opacity", 0.25)
        .attr("stroke-dasharray", "3,3");

      const gy = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
      gy
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ""))
        .selectAll("line")
        .attr("stroke", "#374151")
        .attr("stroke-opacity", 0.25)
        .attr("stroke-dasharray", "3,3");

      // axes (outside clip)
      const xAxis = dayOfWeekTicks
        ? (() => {
            const desired = Math.min(8, Math.max(3, Math.floor(width / 100)));
            const step = Math.max(1, Math.floor(series.length / desired));
            const tickDates: Date[] = [];
            for (let i = 0; i < series.length; i += step) tickDates.push(series[i].date);
            if (tickDates.length === 0 && series.length > 0) tickDates.push(series[0].date);
            const fmt = d3.timeFormat("%a");
            return d3.axisBottom(x).tickValues(tickDates).tickFormat((d: any) => fmt(d as Date));
          })()
        : d3.axisBottom(x).ticks(8);

      svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top + height})`)
        .call(xAxis)
        .call((axis) => axis.selectAll("text").attr("fill", "#9ca3af").style("font-size", "12px"))
        .call((axis) => axis.selectAll("path,line").attr("stroke", "#4b5563"));

      svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .call(
          d3
            .axisLeft(y)
            .ticks(6)
            .tickFormat((d: any) =>
              yLabel && yLabel.includes("%") ? `${Number(d).toFixed(0)}%` : d3.format("~s")(d as number)
            )
        )
        .call((axis) => axis.selectAll("text").attr("fill", "#9ca3af").style("font-size", "12px"))
        .call((axis) => axis.selectAll("path,line").attr("stroke", "#4b5563"));

      // draw area + line (inside clip)
      g.append("path").datum(series).attr("fill", "url(#streamGradient)").attr("d", area);

      g
        .append("path")
        .datum(series)
        .attr("fill", "none")
        .attr("stroke", "#06b6d4")
        .attr("stroke-width", 2)
        .attr("d", line);

      if (showSigma) {
        // 3-sigma positive reference line (based on currently shown data)
        const ys = series.map((d) => d.y);
        const mean = ys.reduce((a, b) => a + b, 0) / Math.max(ys.length, 1);
        const variance = ys.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(ys.length, 1);
        const std = Math.sqrt(variance);
        const pos3 = mean + 3 * std;
        const overlay = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        const yPos = y(pos3);
        if (isFinite(yPos)) {
          overlay
            .append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yPos)
            .attr("y2", yPos)
            .attr("stroke", "#8884d8")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "6,6")
            .attr("opacity", 0.9);
          overlay
            .append("text")
            .attr("x", width - 4)
            .attr("y", yPos - 4)
            .attr("text-anchor", "end")
            .style("fill", "#9ca3af")
            .style("font-size", "11px")
            .text("+3σ");
        }
      }

      // no dots for smooth look
    };

    render();

    const ro = new ResizeObserver(() => render());
    ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, [data]);

  return (
    <Card className="p-2 flex flex-col bg-card border border-border w-full">
      <span className={centerTitle ? "text-base font-bold mb-2 text-center" : "text-xs text-muted-foreground mb-2"} style={centerTitle ? { fontSize: "1.25rem" } : {}}>
        {title}
      </span>
      <svg ref={svgRef} width="100%" style={{ height: 360 }} />
    </Card>
  );
}

export function EnhancedBarChart({ title, data, xLabel, yLabel, centerTitle = false }: EnhancedBarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);

    const render = () => {
      const node = svgRef.current!;
      const containerWidth = node.clientWidth || 800;
      const margin = { top: 20, right: 24, bottom: 28, left: 140 };
      const width = Math.max(320, containerWidth) - margin.left - margin.right;
      const height = 420 - margin.top - margin.bottom;

      svg.selectAll("*").remove();
      svg.attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

      const x = d3.scaleLinear().domain([0, (d3.max(data, (d) => d.y) as number) || 1]).nice().range([0, width]);
      const y = d3.scaleBand().domain(data.map((d) => d.x)).range([0, height]).padding(0.12);

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat((d: any) => d3.format("~s")(d)))
        .call((axis) => axis.selectAll("text").attr("fill", "#9ca3af").style("font-size", "12px"))
        .call((axis) => axis.selectAll("path,line").attr("stroke", "#4b5563"));

      g.append("g")
        .call(d3.axisLeft(y))
        .call((axis) => axis.selectAll("text").attr("fill", "#9ca3af").style("font-size", "12px"))
        .call((axis) => axis.selectAll("path,line").attr("stroke", "#4b5563"));

      const defs = svg.append("defs");
      const gradient = defs
        .append("linearGradient")
        .attr("id", "barGradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

      gradient.append("stop").attr("offset", "0%").attr("stop-color", "#06b6d4").attr("stop-opacity", 0.85);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", "#0891b2").attr("stop-opacity", 1);

      g.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", (d) => y(d.x)!)
        .attr("width", (d) => x(d.y))
        .attr("height", y.bandwidth())
        .attr("fill", "url(#barGradient)")
        .attr("rx", 6)
        .attr("ry", 6)
        .on("mouseover", function (event, d) {
          d3.select(this).attr("fill", "#0891b2");
        })
        .on("mouseout", function (event, d) {
          d3.select(this).attr("fill", "url(#barGradient)");
        });

      g.selectAll(".value-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "value-label")
        .attr("x", (d) => x(d.y) + 8)
        .attr("y", (d) => (y(d.x)! + y.bandwidth() / 2))
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("fill", "#9ca3af")
        .text((d) => d.y.toFixed(2));
    };

    render();
    const ro = new ResizeObserver(() => render());
    ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, [data]);

  return (
    <Card className="p-2 flex flex-col bg-card border border-border w-full">
      <span className={centerTitle ? "text-base font-bold mb-2 text-center" : "text-xs text-muted-foreground mb-2"} style={centerTitle ? { fontSize: "1.25rem" } : {}}>
        {title}
      </span>
      <svg ref={svgRef} width="100%" style={{ height: 460 }} />
    </Card>
  );
}

export function SimpleBarChart({ title, values, centerTitle = false }: { title: string; values: number[]; centerTitle?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !values || values.length === 0) return;

    const svg = d3.select(svgRef.current);
    const render = () => {
      const node = svgRef.current!;
      const containerWidth = node.clientWidth || 800;
      const margin = { top: 20, right: 24, bottom: 34, left: 56 };
      const width = Math.max(320, containerWidth) - margin.left - margin.right;
      const height = 320;

      svg.selectAll("*").remove();
      svg.attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

      


      const x = d3.scaleBand().domain(values.map((_, i) => String(i))).range([0, width]).padding(0.2);
      const y = d3.scaleLinear().domain([0, d3.max(values) as number]).nice().range([height, 0]);

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .call((axis) => axis.selectAll("text").attr("fill", "#9ca3af").style("font-size", "12px"))
        .call((axis) => axis.selectAll("path,line").attr("stroke", "#4b5563"));

      g.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("~s")))
        .call((axis) => axis.selectAll("text").attr("fill", "#9ca3af").style("font-size", "12px"))
        .call((axis) => axis.selectAll("path,line").attr("stroke", "#4b5563"));

      const defs = svg.append("defs");
      const gradient = defs
        .append("linearGradient")
        .attr("id", "simpleBarGradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
      gradient.append("stop").attr("offset", "0%").attr("stop-color", "#06b6d4").attr("stop-opacity", 0.9);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", "#06b6d4").attr("stop-opacity", 0.3);

      g.selectAll(".bar")
        .data(values)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (_, i) => x(String(i))!)
        .attr("y", (d) => y(d))
        .attr("width", x.bandwidth())
        .attr("height", (d) => height - y(d))
        .attr("fill", "url(#simpleBarGradient)")
        .attr("rx", 6)
        .attr("ry", 6);
    };

    render();
    const ro = new ResizeObserver(() => render());
    ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, [values]);

  return (
    <Card className="p-2 flex flex-col bg-card border border-border w-full">
      <span className={centerTitle ? "text-base font-bold mb-2 text-center" : "text-xs text-muted-foreground mb-2"} style={centerTitle ? { fontSize: "1.25rem" } : {}}>
        {title}
      </span>
      <svg ref={svgRef} width="100%" style={{ height: 360 }} />
    </Card>
  );
}
