"use client";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import Papa, { ParseResult, ParseError } from "papaparse";
import { Card } from "../components/ui/card";
import { LucideActivity } from "lucide-react";
import { KPIChart, ChartData, TopUsersBarChart } from "../components/Charts";
import { StreamChart, EnhancedBarChart, SimpleBarChart } from "../components/D3Charts";
import { Select } from "../components/ui/select";
import { useRef } from "react";

const CSV_PATH = "/vibe_data.csv";

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdown filter state
  const [cubeFilter, setCubeFilter] = useState<string | undefined>(undefined);
  const [userFilter, setUserFilter] = useState<string | undefined>(undefined);
  const [orgFilter, setOrgFilter] = useState<string | undefined>(undefined);
  const [projFilter, setProjFilter] = useState<string | undefined>(undefined);

  // Text input state for filters
  const [orgInput, setOrgInput] = useState("");
  const [userInput, setUserInput] = useState("");

  // Only show May 2025 and later data
  const data2025 = useMemo(() => data.filter(row => {
    if (!row.QueryHour) return false;
    // Accept if QueryHour is '2025-05' or later
    const [year, month] = row.QueryHour.split('-');
    return Number(year) > 2025 || (Number(year) === 2025 && Number(month) >= 5);
  }), [data]);

  // Use data2025 for all calculations
  // Filtered data based on text input
  const filteredData = useMemo(() => {
    return data2025.filter((row) => {
      const orgMatch = orgInput ? row.OrganizationId?.toLowerCase().includes(orgInput.toLowerCase()) : true;
      const userMatch = userInput ? row.UserHash?.toLowerCase().includes(userInput.toLowerCase()) : true;
      return orgMatch && userMatch;
    });
  }, [data2025, orgInput, userInput]);

  // Only show May 4 to May 17, 2025 for TotalQueries per Day
  const may4to17Data = useMemo(() => filteredData.filter(row => {
    if (!row.QueryHour) return false;
    // Extract date part
    const dateStr = row.QueryHour.split(' ')[0];
    return dateStr >= '2025-05-04' && dateStr <= '2025-05-17';
  }), [filteredData]);
  // KPI chart data for May 4-17, 2025 only
  const may4to17KpiData = useMemo(() => {
    const byHour: Record<string, { total: number; success: number; users: Set<string>; queries: number; wallTimeSum: number; wallTimeCount: number }> = {};
    may4to17Data.forEach((row) => {
      const hour = row.QueryHour;
      if (!byHour[hour]) byHour[hour] = { total: 0, success: 0, users: new Set(), queries: 0, wallTimeSum: 0, wallTimeCount: 0 };
      byHour[hour].total += 1;
      if (row.Succeeded && row.Succeeded.toLowerCase() === "true") byHour[hour].success += 1;
      byHour[hour].users.add(row.UserHash);
      byHour[hour].queries += Number(row.TotalQueries) || 0;
      if (row.AvgWallTime) {
        byHour[hour].wallTimeSum += Number(row.AvgWallTime) || 0;
        byHour[hour].wallTimeCount += 1;
      }
    });
    const hours = Object.keys(byHour).sort();
    return {
      totalQueries: hours.map((h) => ({ x: h, y: byHour[h].queries })),
    };
  }, [may4to17Data]);

  // Only show May 6 to May 15, 2025 for AvgWallTime and TotalQueries per Day
  const may6to15Data = useMemo(() => filteredData.filter(row => {
    if (!row.QueryHour) return false;
    // Extract date part
    const dateStr = row.QueryHour.split(' ')[0];
    return dateStr >= '2025-05-06' && dateStr <= '2025-05-15';
  }), [filteredData]);
  // KPI chart data for May 6-15, 2025 only
  const may6to15KpiData = useMemo(() => {
    const byHour: Record<string, { total: number; success: number; users: Set<string>; queries: number; wallTimeSum: number; wallTimeCount: number }> = {};
    may6to15Data.forEach((row) => {
      const hour = row.QueryHour;
      if (!byHour[hour]) byHour[hour] = { total: 0, success: 0, users: new Set(), queries: 0, wallTimeSum: 0, wallTimeCount: 0 };
      byHour[hour].total += 1;
      if (row.Succeeded && row.Succeeded.toLowerCase() === "true") byHour[hour].success += 1;
      byHour[hour].users.add(row.UserHash);
      byHour[hour].queries += Number(row.TotalQueries) || 0;
      if (row.AvgWallTime) {
        byHour[hour].wallTimeSum += Number(row.AvgWallTime) || 0;
        byHour[hour].wallTimeCount += 1;
      }
    });
    const hours = Object.keys(byHour).sort();
    return {
      totalQueries: hours.map((h) => ({ x: h, y: byHour[h].queries })),
      avgWallTime: hours.map((h) => ({ x: h, y: byHour[h].wallTimeCount ? byHour[h].wallTimeSum / byHour[h].wallTimeCount : 0 })),
    };
  }, [may6to15Data]);

  // Only show May 6 to May 13, 2025 for TotalQueries per Day
  const may6to13Data = useMemo(() => filteredData.filter(row => {
    if (!row.QueryHour) return false;
    // Extract date part
    const dateStr = row.QueryHour.split(' ')[0];
    return dateStr >= '2025-05-06' && dateStr <= '2025-05-13';
  }), [filteredData]);
  // KPI chart data for May 6-13, 2025 only
  const may6to13KpiData = useMemo(() => {
    const byHour: Record<string, { total: number; success: number; users: Set<string>; queries: number; wallTimeSum: number; wallTimeCount: number }> = {};
    may6to13Data.forEach((row) => {
      const hour = row.QueryHour;
      if (!byHour[hour]) byHour[hour] = { total: 0, success: 0, users: new Set(), queries: 0, wallTimeSum: 0, wallTimeCount: 0 };
      byHour[hour].total += 1;
      if (row.Succeeded && row.Succeeded.toLowerCase() === "true") byHour[hour].success += 1;
      byHour[hour].users.add(row.UserHash);
      byHour[hour].queries += Number(row.TotalQueries) || 0;
      if (row.AvgWallTime) {
        byHour[hour].wallTimeSum += Number(row.AvgWallTime) || 0;
        byHour[hour].wallTimeCount += 1;
      }
    });
    const hours = Object.keys(byHour).sort();
    return {
      totalQueries: hours.map((h) => ({ x: h, y: byHour[h].queries })),
    };
  }, [may6to13Data]);

  // Helper: get unique values for dropdowns
  const unique = (key: string) => Array.from(new Set(data.map((row) => row[key]).filter(Boolean)));

  // Filtered window for SuccessRate over time: 2025-05-12 to 2025-06-22
  const successWindowData = useMemo(() => filteredData.filter(row => {
    if (!row.QueryHour) return false;
    const dateStr = row.QueryHour.split(' ')[0];
    return dateStr >= '2025-05-12' && dateStr <= '2025-06-22';
  }), [filteredData]);

  // KPI chart data
  const kpiData = useMemo(() => {
    // SuccessRate over time (weekly smoothed)
    const byHour: Record<string, { total: number; success: number; users: Set<string>; queries: number; wallTimeSum: number; wallTimeCount: number }> = {};
    successWindowData.forEach((row) => {
      const hour = row.QueryHour;
      if (!byHour[hour]) byHour[hour] = { total: 0, success: 0, users: new Set(), queries: 0, wallTimeSum: 0, wallTimeCount: 0 };
      byHour[hour].total += 1;
      if (row.Succeeded && row.Succeeded.toLowerCase() === "true") byHour[hour].success += 1;
      byHour[hour].users.add(row.UserHash);
      byHour[hour].queries += Number(row.TotalQueries) || 0;
      if (row.AvgWallTime) {
        byHour[hour].wallTimeSum += Number(row.AvgWallTime) || 0;
        byHour[hour].wallTimeCount += 1;
      }
    });
    const hours = Object.keys(byHour).sort();
    // Weekly smoothing for success rate
    const toMonday = (d: Date) => {
      const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const day = (utc.getUTCDay() + 6) % 7; // 0 = Monday
      const monday = new Date(utc);
      monday.setUTCDate(utc.getUTCDate() - day);
      return monday.toISOString().slice(0, 10); // YYYY-MM-DD (Monday)
    };
    const byWeek: Record<string, { total: number; success: number }> = {};
    hours.forEach((h) => {
      const dateStr = h.split(" ")[0];
      const weekKey = toMonday(new Date(dateStr));
      const w = byWeek[weekKey] || { total: 0, success: 0 };
      w.total += byHour[h].total;
      w.success += byHour[h].success;
      byWeek[weekKey] = w;
    });
    const weekKeys = Object.keys(byWeek).sort();
    return {
      successRate: weekKeys.map((wk) => ({ x: wk, y: byWeek[wk].total ? (byWeek[wk].success / byWeek[wk].total) * 100 : 0 })),
      activeUsers: hours.map((h) => ({ x: h, y: byHour[h].users.size })),
      totalQueries: hours.map((h) => ({ x: h, y: byHour[h].queries })),
      avgWallTime: hours.map((h) => ({ x: h, y: byHour[h].wallTimeCount ? byHour[h].wallTimeSum / byHour[h].wallTimeCount : 0 })),
    };
  }, [successWindowData]);

  // Additional visuals data
  const groupAvg = (key: string) => {
    const groups: Record<string, { sum: number; count: number }> = {};
    filteredData.forEach((row) => {
      const k = row[key];
      if (!groups[k]) groups[k] = { sum: 0, count: 0 };
      groups[k].sum += Number(row.AvgWallTime) || 0;
      groups[k].count += 1;
    });
    return Object.entries(groups).map(([k, v]) => ({ x: k, y: v.count ? v.sum / v.count : 0 }));
  };
  // Top users by total activity
  const groupAvgUsers = () => {
    const users: Record<string, number> = {};
    filteredData.forEach((row) => {
      const user = row.UserHash;
      users[user] = (users[user] || 0) + 1;
    });
    return Object.entries(users).map(([x, y]) => ({ x, y }));
  };

  // Top 10 by group (CubeName, UserHash, OrganizationId, ProjectId) by AvgWallTime
  const top10ByGroup = (key: string) => {
    const groups: Record<string, { sum: number; count: number }> = {};
    filteredData.forEach((row) => {
      const k = row[key];
      if (!groups[k]) groups[k] = { sum: 0, count: 0 };
      groups[k].sum += Number(row.AvgWallTime) || 0;
      groups[k].count += 1;
    });
    return Object.entries(groups)
      .map(([k, v]) => ({ x: k, y: v.count ? v.sum / v.count : 0 }))
      .sort((a, b) => b.y - a.y)
      .slice(0, 10);
  };

  // Fetch and parse CSV
  useEffect(() => {
    fetch(CSV_PATH)
      .then((res) => res.text())
      .then((csv) => {
        Papa.parse(csv, {
          header: true,
          skipEmptyLines: true,
          complete: (results: ParseResult<any>) => {
            setData(results.data as any[]);
            setLoading(false);
          },
          error: (err: any) => {
            setError("Failed to parse CSV");
            setLoading(false);
          },
        });
      })
      .catch(() => {
        setError("Failed to load CSV");
        setLoading(false);
      });
  }, []);

  // Compute summary statistics
  const summary = useMemo(() => {
    if (!data.length) return null;
    const userHashes = new Set<string>();
    const orgIds = new Set<string>();
    const cubeNames = new Set<string>();
    let totalQueries = 0;
    let totalDays = new Set<string>();
    let successCount = 0;
    let totalCount = 0;
    let wallTimeSum = 0;
    let wallTimeCount = 0;
    data.forEach((row) => {
      userHashes.add(row.UserHash);
      orgIds.add(row.OrganizationId);
      cubeNames.add(row.CubeName);
      totalQueries += Number(row.TotalQueries) || 0;
      // Extract day from QueryHour (YYYY-MM-DD)
      if (row.QueryHour) {
        totalDays.add(row.QueryHour.split(" ")[0]);
      }
      if (row.Succeeded && row.Succeeded.toLowerCase() === "true") {
        successCount += 1;
      }
      totalCount += 1;
      if (row.AvgWallTime) {
        wallTimeSum += Number(row.AvgWallTime) || 0;
        wallTimeCount += 1;
      }
    });
    return {
      totalUserHash: userHashes.size,
      totalOrgId: orgIds.size,
      totalCubeNames: cubeNames.size,
      avgTotalQueriesPerDay: totalDays.size ? (totalQueries / totalDays.size).toFixed(2) : "--",
      overallSuccessRate: totalCount ? ((successCount / totalCount) * 100).toFixed(2) + "%" : "--",
      overallAvgWallTime: wallTimeCount ? (wallTimeSum / wallTimeCount).toFixed(3) : "--",
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-4 py-8 gap-8">
      {/* Logo and subtitle */}
      <div className="flex flex-col items-center gap-2">
        <Image
          src="/vibe_logo.png"
          alt="Pulse Logo"
          width={320}
          height={120}
          priority
        />
      </div>
      {/* Textbox filters */}
      <div className="flex flex-row gap-4 w-full max-w-4xl justify-center items-center">
        <div className="flex flex-col gap-1 w-1/2">
          <label htmlFor="org-input" className="text-xs">OrganizationId</label>
          <input id="org-input" type="text" value={orgInput} onChange={e => setOrgInput(e.target.value)} className="border rounded px-2 py-1 w-full bg-background text-foreground" placeholder="Enter OrganizationId..." />
        </div>
        <div className="flex flex-col gap-1 w-1/2">
          <label htmlFor="user-input" className="text-xs">UserHash</label>
          <input id="user-input" type="text" value={userInput} onChange={e => setUserInput(e.target.value)} className="border rounded px-2 py-1 w-full bg-background text-foreground" placeholder="Enter UserHash..." />
        </div>
      </div>
      {/* Intro section */}
      <Card className="max-w-2xl w-full p-6 bg-card/80 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <LucideActivity className="text-primary" size={20} />
          <h2 className="text-lg font-semibold">Welcome to Pulse: Customer Data Health Dashboard</h2>
        </div>
        <p className="text-sm mb-2">
          Monitoring customer data health is essential for ensuring reliable, responsive, and high-quality digital experiences. Pulse empowers executives and teams to track key performance indicators (KPIs) and proactively address issues before they impact users.
        </p>
        <p className="text-sm">
          <b>WallTime</b> is the time it takes from user input to user response. Lower WallTime means faster, more satisfying user experiences. Pulse helps you monitor and optimize this critical metric, along with overall system health.
        </p>
      </Card>
      {/* Summary statistics */}
      <Card className="w-full max-w-4xl p-6 flex flex-col gap-4 bg-card/80 shadow-lg">
        <h3 className="text-base font-semibold mb-2">Summary Statistics</h3>
        {loading ? (
          <div className="text-center text-muted-foreground">Loading data...</div>
        ) : error ? (
          <div className="text-center text-destructive">{error}</div>
        ) : summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold">{summary.totalUserHash}</span>
              <span className="text-xs text-muted-foreground">Total UserHash</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold">{summary.totalOrgId}</span>
              <span className="text-xs text-muted-foreground">Total OrganizationalId</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold">{summary.totalCubeNames}</span>
              <span className="text-xs text-muted-foreground">Total CubeNames</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold">{summary.avgTotalQueriesPerDay}</span>
              <span className="text-xs text-muted-foreground">Avg TotalQueries/Day</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold">{summary.overallSuccessRate}</span>
              <span className="text-xs text-muted-foreground">Overall Success Rate</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold">{summary.overallAvgWallTime}</span>
              <span className="text-xs text-muted-foreground">Overall Avg WallTime</span>
            </div>
          </div>
        ) : null}
      </Card>
      {/* KPI Visuals */}
      <Card className="w-full max-w-4xl p-6 bg-card/80 shadow-lg flex flex-col gap-4">
        <h3 className="text-base font-semibold mb-2">Key Performance Indicators (KPIs)</h3>
        <div className="flex flex-col gap-6 w-full">
          <StreamChart title="Query Success Rate" data={kpiData.successRate} yLabel="SuccessRate (%)" centerTitle yDomain={[0, 100]} areaOnly showSigma={false} />
          <StreamChart title="TotalQueries per Day" data={may6to13KpiData.totalQueries} centerTitle areaOnly dayOfWeekTicks />
          <StreamChart title="ResponseTime(ms)" data={may6to15KpiData.avgWallTime} centerTitle areaOnly dayOfWeekTicks />
          <SimpleBarChart title="Sample Bars" values={[0,1,2,3,4,5]} centerTitle />
        </div>
      </Card>
      {/* Additional Information */}
      <Card className="w-full max-w-4xl p-6 bg-card/80 shadow-lg flex flex-col gap-4">
        <h3 className="text-base font-semibold mb-2">Additional Information</h3>
        <div className="flex flex-col gap-6 w-full">
          <TopUsersBarChart title="Top 10 Most Active Users" data={groupAvgUsers()} xLabel="Total Activity" yLabel="UserHash" axisMargin={40} centerTitle />
          <EnhancedBarChart title="Top 10 CubeNames by AvgWallTime" data={top10ByGroup("CubeName")} centerTitle />
          <EnhancedBarChart title="Top 10 UserHash by AvgWallTime" data={top10ByGroup("UserHash")} centerTitle />
          <EnhancedBarChart title="Top 10 OrganizationId by AvgWallTime" data={top10ByGroup("OrganizationId")} centerTitle />
          <EnhancedBarChart title="Top 10 ProjectId by AvgWallTime" data={top10ByGroup("ProjectId")} centerTitle />
        </div>
      </Card>
    </div>
  );
}
