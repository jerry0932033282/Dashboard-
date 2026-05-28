/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  FileSpreadsheet, 
  Play, 
  Pause, 
  Calendar, 
  DollarSign, 
  ArrowUpRight, 
  CheckCircle2, 
  Hourglass, 
  AlertCircle, 
  XCircle,
  RefreshCw
} from 'lucide-react';
import { generateSeedData, generateNextDayRecord } from './dataGenerator';
import { FundDataRecord, Timeframe } from './types';

export default function App() {
  // Primary datasets
  const [dataset, setDataset] = useState<FundDataRecord[]>(() => generateSeedData());
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(24 * 3600);
  
  // Interactive hovers for coordinates on charts
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
  const [hoveredAumIndex, setHoveredAumIndex] = useState<number | null>(null);

  // Series visibility in Trend Chart
  const [showSubscription, setShowSubscription] = useState<boolean>(true);
  const [showRedemption, setShowRedemption] = useState<boolean>(true);
  const [showNetFlow, setShowNetFlow] = useState<boolean>(true);

  // Time format calculations
  const formattedCountdown = useMemo(() => {
    const hrs = Math.floor(countdown / 3600).toString().padStart(2, '0');
    const mins = Math.floor((countdown % 3600) / 60).toString().padStart(2, '0');
    const secs = (countdown % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }, [countdown]);

  const [customDaysCount, setCustomDaysCount] = useState<string>('7');

  // --- New states for account opening funnel monthly options ---
  const [selectedFunnelMonth, setSelectedFunnelMonth] = useState<string>('latest');

  // Compute a list of distinct YYYY-MM months present in dataset
  const availableFunnelMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    dataset.forEach(d => {
      monthsSet.add(`${d.year}-${d.month}`);
    });
    return Array.from(monthsSet).sort();
  }, [dataset]);

  // Compute the record for chosen month or latest
  const funnelRecord = useMemo(() => {
    if (selectedFunnelMonth === 'latest') {
      return dataset[dataset.length - 1];
    }
    // Filter records in that month
    const monthRecs = dataset.filter(d => `${d.year}-${d.month}` === selectedFunnelMonth);
    if (monthRecs.length > 0) {
      // End of that month's snap state
      return monthRecs[monthRecs.length - 1];
    }
    return dataset[dataset.length - 1];
  }, [dataset, selectedFunnelMonth]);

  // Compute net additions (delta) within that specific month (or standard period)
  const funnelDelta = useMemo(() => {
    if (selectedFunnelMonth === 'latest') {
      // Compare the current latest with the beginning of state or previous 30 days
      const baseline = dataset[Math.max(0, dataset.length - 30)];
      const current = dataset[dataset.length - 1];
      return {
        isLatestAllTime: true,
        periodName: '近30天',
        deltaTotal: current.accTotal - baseline.accTotal,
        deltaSuccess: current.accSuccess - baseline.accSuccess,
        deltaPending: current.accPending - baseline.accPending,
        deltaMissing: current.accMissing - baseline.accMissing,
        deltaFailed: current.accFailed - baseline.accFailed,
      };
    }

    // Find first day of the selected month inside dataset to subtract
    const monthRecs = dataset.filter(d => `${d.year}-${d.month}` === selectedFunnelMonth);
    if (monthRecs.length === 0) return null;

    const firstIndex = dataset.findIndex(d => `${d.year}-${d.month}` === selectedFunnelMonth);
    const baseline = firstIndex > 0 ? dataset[firstIndex - 1] : {
      accTotal: 0,
      accSuccess: 0,
      accPending: 0,
      accMissing: 0,
      accFailed: 0,
    };
    
    const endState = monthRecs[monthRecs.length - 1];
    return {
      isLatestAllTime: false,
      periodName: `${selectedFunnelMonth} 整個月份`,
      deltaTotal: endState.accTotal - baseline.accTotal,
      deltaSuccess: endState.accSuccess - baseline.accSuccess,
      deltaPending: endState.accPending - baseline.accPending,
      deltaMissing: endState.accMissing - baseline.accMissing,
      deltaFailed: endState.accFailed - baseline.accFailed,
    };
  }, [dataset, selectedFunnelMonth]);

  // Handle core simulation increments
  const triggerSimulationAdvancement = useCallback((days: number) => {
    if (isNaN(days) || days <= 0) return;
    setDataset(prev => {
      let currentList = [...prev];
      for (let i = 0; i < days; i++) {
        const lastItem = currentList[currentList.length - 1];
        const newItem = generateNextDayRecord(lastItem);
        currentList.push(newItem);
      }
      return currentList;
    });
    setCountdown(24 * 3600);
  }, []);

  const triggerDailyUpdate = useCallback(() => {
    triggerSimulationAdvancement(1);
  }, [triggerSimulationAdvancement]);

  // Auto-play ticking engine
  useEffect(() => {
    let interval: any = null;
    if (autoPlay) {
      interval = setInterval(() => {
        triggerDailyUpdate();
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoPlay, triggerDailyUpdate]);

  // Static chronological countdown decrement
  useEffect(() => {
    const timer = setInterval(() => {
      if (!autoPlay) {
        setCountdown(prev => {
          if (prev <= 1) {
            triggerDailyUpdate();
            return 24 * 3600;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [autoPlay, triggerDailyUpdate]);

  // Process data grouping based on active Timeframe selection
  const aggregatedData = useMemo(() => {
    if (timeframe === 'daily') {
      // 30 days window for smooth representation density
      return dataset.slice(-30).map(d => ({ label: d.date, ...d }));
    }

    const groups: { [key: string]: FundDataRecord } = {};
    dataset.forEach(d => {
      let key = '';
      if (timeframe === 'monthly') key = `${d.year}-${d.month}`;
      else if (timeframe === 'quarterly') key = `${d.year}-${d.quarter}`;
      else if (timeframe === 'yearly') key = `${d.year}年`;

      if (!groups[key]) {
        groups[key] = {
          ...d,
          date: key,
          subSingle: 0,
          subRSP: 0,
          totalSub: 0,
          redSingle: 0,
          redRSP: 0,
          totalRed: 0,
          netFlow: 0,
        };
      }
      groups[key].subSingle += d.subSingle;
      groups[key].subRSP += d.subRSP;
      groups[key].totalSub += d.totalSub;
      groups[key].redSingle += d.redSingle;
      groups[key].redRSP += d.redRSP;
      groups[key].totalRed += d.totalRed;
      groups[key].netFlow += d.netFlow;
      // Key state snap-to-period points
      groups[key].aum = d.aum;
      groups[key].accPending = d.accPending;
      groups[key].accSuccess = d.accSuccess;
      groups[key].accMissing = d.accMissing;
      groups[key].accFailed = d.accFailed;
      groups[key].accTotal = d.accTotal;
      groups[key].accRate = d.accRate;
    });

    return Object.keys(groups).map(key => ({
      label: key,
      ...groups[key],
    }));
  }, [dataset, timeframe]);

  // Focus snapshot elements
  const latestRecord = useMemo(() => {
    return aggregatedData[aggregatedData.length - 1] || dataset[dataset.length - 1];
  }, [aggregatedData, dataset]);

  const previousRecord = useMemo(() => {
    return aggregatedData[aggregatedData.length - 2] || latestRecord;
  }, [aggregatedData, latestRecord]);

  // Trend computation
  const aumPercentageGrowth = useMemo(() => {
    const growth = ((latestRecord.aum - previousRecord.aum) / (previousRecord.aum || 1)) * 100;
    return parseFloat(growth.toFixed(2));
  }, [latestRecord, previousRecord]);

  const activeDateString = useMemo(() => {
    return dataset[dataset.length - 1]?.date || '';
  }, [dataset]);

  // Client-side instant secure download action
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += '時間區間,總申購量(萬),單筆申購,定期定額申購,總贖回量(萬),單筆贖回,定期個人贖回,淨申贖流向(萬),期末AUM規模(億),開戶完成率\n';
    
    aggregatedData.forEach(item => {
      csvContent += `${item.label},${item.totalSub},${item.subSingle},${item.subRSP},${item.totalRed},${item.redSingle},${item.redRSP},${item.netFlow},${item.aum.toFixed(2)},${item.accRate}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodedUri);
    downloadAnchor.setAttribute('download', `基金平台數據智慧報表_${timeframe}_${activeDateString}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  // ----------------------------------------------------
  // SVG Chart Graphics Render Calculation Logic
  // ----------------------------------------------------
  // Setup standard dimensions for responsive SVG drawing frames
  const chartWidth = 500;
  const chartHeight = 180;
  const chartPadding = 35;
  const drawWidth = chartWidth - chartPadding * 2;
  const drawHeight = chartHeight - chartPadding * 2;

  // Render arrays for the Trend line chart (subscriptions and redemptions)
  const trendSlice = useMemo(() => {
    return aggregatedData.slice(-12); // Capture the latest 12 entries
  }, [aggregatedData]);

  const { trendPoints, trendMaxVal } = useMemo(() => {
    if (trendSlice.length === 0) return { trendPoints: [], trendMaxVal: 100 };
    
    const maxSubVal = Math.max(...trendSlice.map(d => d.totalSub));
    const maxRedVal = Math.max(...trendSlice.map(d => d.totalRed));
    const maxVal = Math.max(maxSubVal, maxRedVal, 50) * 1.1; // 10% overflow top padding

    const stepX = drawWidth / Math.max(1, trendSlice.length - 1);
    
    const points = trendSlice.map((record, i) => {
      const x = chartPadding + i * stepX;
      // Calculate responsive visual scales
      const subRatio = record.totalSub / maxVal;
      const subY = chartHeight - chartPadding - subRatio * drawHeight;

      const redRatio = record.totalRed / maxVal;
      const redY = chartHeight - chartPadding - redRatio * drawHeight;

      const netRatio = record.netFlow / maxVal;
      const netY = chartHeight - chartPadding - netRatio * drawHeight;

      return { x, subY, redY, netY, record };
    });

    return { trendPoints: points, trendMaxVal: maxVal };
  }, [trendSlice, drawWidth, drawHeight]);

  // Generate SVG Cubic Path expressions
  const linePaths = useMemo(() => {
    if (trendPoints.length === 0) return { subPath: '', redPath: '', netPath: '', subAreaPath: '' };

    let subPath = `M ${trendPoints[0].x} ${trendPoints[0].subY}`;
    let redPath = `M ${trendPoints[0].x} ${trendPoints[0].redY}`;
    let netPath = `M ${trendPoints[0].x} ${trendPoints[0].netY}`;
    
    for (let i = 1; i < trendPoints.length; i++) {
      // Connect points nicely
      subPath += ` L ${trendPoints[i].x} ${trendPoints[i].subY}`;
      redPath += ` L ${trendPoints[i].x} ${trendPoints[i].redY}`;
      netPath += ` L ${trendPoints[i].x} ${trendPoints[i].netY}`;
    }

    // Build translucent ambient glowing fill pathway
    const subAreaPath = `
      ${subPath} 
      L ${trendPoints[trendPoints.length - 1].x} ${chartHeight - chartPadding} 
      L ${trendPoints[0].x} ${chartHeight - chartPadding} 
      Z
    `;

    return { subPath, redPath, netPath, subAreaPath };
  }, [trendPoints]);

  // Compute AUM dynamic bar values
  const aumMaxVal = useMemo(() => {
    const max = Math.max(...trendSlice.map(d => d.aum), 10);
    return max * 1.15;
  }, [trendSlice]);

  const aumBars = useMemo(() => {
    if (trendSlice.length === 0) return [];
    
    const stepX = drawWidth / (trendSlice.length);
    const barWidth = Math.max(12, stepX * 0.55);

    return trendSlice.map((record, i) => {
      const x = chartPadding + i * stepX + (stepX - barWidth) / 2;
      const ratio = record.aum / aumMaxVal;
      const height = ratio * drawHeight;
      const y = chartHeight - chartPadding - height;

      return {
        x,
        y,
        width: barWidth,
        height,
        record
      };
    });
  }, [trendSlice, aumMaxVal, drawWidth, drawHeight]);

  return (
    <div className="min-h-screen font-sans bg-brand-bg text-slate-100 selection:bg-blue-600 selection:text-white p-4 sm:p-6 lg:p-8">
      <div id="dashboard-wrapper" className="max-w-7xl mx-auto">
        
        {/* Core Screen Header Section */}
        <header id="header" className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h1 id="app-title" className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                基金平台數據智慧儀表板
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              系統狀態：運作正常 &bull; 每日 00:00 自動同步更新
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-slate-900/65 p-2 rounded-xl border border-slate-800">
            <div className="text-xs font-mono px-2 text-slate-300">
              下一輪自動更新倒數: <span id="countdown" className="text-emerald-400 font-bold ml-1">{formattedCountdown}</span>
            </div>
            
            <div className="flex items-center gap-1.5 bg-slate-950/40 p-1 rounded-lg border border-slate-800/80">
              <span className="text-[11px] text-slate-400 font-sans pl-1">前進天數:</span>
              <input 
                type="number" 
                min="1" 
                max="365"
                value={customDaysCount}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomDaysCount(val);
                }}
                className="w-12 bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs text-white text-center font-mono focus:border-blue-500 focus:outline-none"
                placeholder="7"
                title="輸入自訂模擬天數"
              />
              <button 
                id="manual-sim" 
                onClick={() => {
                  const days = parseInt(customDaysCount, 10);
                  if (!isNaN(days) && days > 0) {
                    triggerSimulationAdvancement(days);
                  } else {
                    triggerSimulationAdvancement(1);
                  }
                }}
                className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-md text-xs font-medium transition-all shadow shadow-blue-500/10 cursor-pointer flex items-center gap-1"
                title="依指定自訂天數前進"
              >
                <RefreshCw className="w-3 h-3" />
                模擬前進
              </button>
            </div>
            
            {/* 常用快捷按鈕 */}
            <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
              <button 
                onClick={() => triggerSimulationAdvancement(1)}
                className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 hover:text-white text-slate-300 rounded text-2xs transition cursor-pointer"
                title="模擬前進 1 天"
              >
                +1 天
              </button>
              <button 
                onClick={() => triggerSimulationAdvancement(7)}
                className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 hover:text-white text-slate-300 rounded text-2xs transition cursor-pointer"
                title="模擬前進 7 天"
              >
                +7 天
              </button>
              <button 
                onClick={() => triggerSimulationAdvancement(30)}
                className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 hover:text-white text-slate-300 rounded text-2xs transition cursor-pointer"
                title="模擬前進 30 天"
              >
                +30 天
              </button>
            </div>

            <button 
              id="autoplay-toggle" 
              onClick={() => setAutoPlay(!autoPlay)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition duration-200 cursor-pointer flex items-center gap-1 ${
                autoPlay 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {autoPlay ? '停止輪播' : '自動輪播'}
            </button>
          </div>
        </header>

        {/* Filters and Date Segment */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
            {(['daily', 'monthly', 'quarterly', 'yearly'] as Timeframe[]).map((tf) => {
              const label = tf === 'daily' ? '每日數據' : tf === 'monthly' ? '每月累計' : tf === 'quarterly' ? '每季累計' : '每年累計';
              return (
                <button
                  key={tf}
                  onClick={() => switchTimeframe(tf)}
                  id={`tf-btn-${tf}`}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    timeframe === tf 
                      ? 'bg-blue-600 text-white shadow font-semibold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            當前系統模擬數據日期: <span id="current-system-date" className="text-slate-200 font-semibold">{activeDateString}</span>
          </div>
        </div>

        {/* 4 Card Matrix Layout */}
        <div id="metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          
          {/* Card AUM */}
          <div className="crypto-card-gradient rounded-2xl p-5 relative overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
            <div className="flex justify-between items-start">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">資產管理規模 (AUM)</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {timeframe === 'daily' ? '每日末' : timeframe === 'monthly' ? '月底末' : timeframe === 'quarterly' ? '季底末' : '年底末'}
              </span>
            </div>
            
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                {latestRecord.aum.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-400">億 TWD</span>
            </div>
            
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`inline-flex items-center gap-0.5 font-bold ${aumPercentageGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {aumPercentageGrowth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {aumPercentageGrowth >= 0 ? `+${aumPercentageGrowth}` : aumPercentageGrowth}%
              </span>
              <span className="text-slate-500 text-[11px]">較前一期</span>
            </div>
          </div>

          {/* Card Inflows */}
          <div className="crypto-card-gradient rounded-2xl p-5 relative overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
            <div className="flex justify-between items-start">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">總申購量</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                區間總額
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight text-emerald-400">
                {latestRecord.totalSub.toLocaleString('zh-TW')}
              </span>
              <span className="text-xs text-slate-400">萬元</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800/60 pt-2 text-[10px] text-slate-400 font-mono">
              <div>
                單筆申購:
                <span className="text-xs text-slate-200 block font-semibold mt-0.5">${latestRecord.subSingle.toLocaleString()}</span>
              </div>
              <div>
                定期定額:
                <span className="text-xs text-slate-200 block font-semibold mt-0.5">${latestRecord.subRSP.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Card Outflows */}
          <div className="crypto-card-gradient rounded-2xl p-5 relative overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
            <div className="flex justify-between items-start">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">總贖回量</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                區間總額
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight text-rose-400">
                {latestRecord.totalRed.toLocaleString('zh-TW')}
              </span>
              <span className="text-xs text-slate-400">萬元</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800/60 pt-2 text-[10px] text-slate-400 font-mono">
              <div>
                單筆贖回:
                <span className="text-xs text-slate-200 block font-semibold mt-0.5">${latestRecord.redSingle.toLocaleString()}</span>
              </div>
              <div>
                定期贖回:
                <span className="text-xs text-slate-200 block font-semibold mt-0.5">${latestRecord.redRSP.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Card Netflows */}
          <div className="crypto-card-gradient rounded-2xl p-5 relative overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${
              latestRecord.netFlow > 0 ? 'bg-emerald-500' : latestRecord.netFlow < 0 ? 'bg-rose-500' : 'bg-amber-500'
            }`}></div>
            <div className="flex justify-between items-start">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">淨申贖 (申購 - 贖回)</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                latestRecord.netFlow > 0 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : latestRecord.netFlow < 0 
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                淨流向
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
                latestRecord.netFlow > 0 ? 'text-emerald-400' : latestRecord.netFlow < 0 ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {latestRecord.netFlow > 0 ? '+' : ''}{latestRecord.netFlow.toLocaleString('zh-TW')}
              </span>
              <span className="text-xs text-slate-400">萬元</span>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                流向狀態: 
                <span className={`font-bold ${
                  latestRecord.netFlow > 0 ? 'text-emerald-400' : latestRecord.netFlow < 0 ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {latestRecord.netFlow > 0 ? '資金淨流入' : latestRecord.netFlow < 0 ? '資金淨流出' : '流入溢額平衡'}
                </span>
              </span>
              {latestRecord.netFlow !== 0 && (
                <span className="text-[10px] text-slate-500 font-mono">
                  {Math.abs(Math.round(latestRecord.netFlow / (latestRecord.totalSub || 1) * 100))}% 占比
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Primary Graphics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Trend Chart Box */}
          <div className="crypto-card-gradient rounded-2xl p-5 lg:col-span-2 flex flex-col justify-between min-h-[350px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  申購與贖回趨勢分析
                </h3>
                <p className="text-xs text-slate-400">複合式波動走勢 (最近12筆時間區間)</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-2xs md:text-xs font-mono">
                <button 
                  onClick={() => setShowSubscription(prev => !prev)}
                  className={`flex items-center gap-1.5 text-emerald-400 transition-all duration-200 cursor-pointer select-none border border-transparent px-1.5 py-0.5 rounded ${
                    showSubscription 
                      ? 'opacity-100 hover:bg-emerald-500/10' 
                      : 'opacity-35 line-through hover:opacity-60 hover:bg-slate-800'
                  }`}
                  title="點擊隱藏/顯示申購趨勢線"
                >
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                  總申購量 (單筆+定期)
                </button>
                <button 
                  onClick={() => setShowRedemption(prev => !prev)}
                  className={`flex items-center gap-1.5 text-rose-400 transition-all duration-200 cursor-pointer select-none border border-transparent px-1.5 py-0.5 rounded ${
                    showRedemption 
                      ? 'opacity-100 hover:bg-rose-500/10' 
                      : 'opacity-35 line-through hover:opacity-60 hover:bg-slate-800'
                  }`}
                  title="點擊隱藏/顯示贖回趨勢線"
                >
                  <span className="w-2.5 h-2.5 border border-dashed border-rose-500 w-3 h-0.5 inline-block"></span>
                  總贖回量
                </button>
                <button 
                  onClick={() => setShowNetFlow(prev => !prev)}
                  className={`flex items-center gap-1.5 text-amber-500 transition-all duration-200 cursor-pointer select-none border border-transparent px-1.5 py-0.5 rounded ${
                    showNetFlow 
                      ? 'opacity-100 hover:bg-amber-500/10' 
                      : 'opacity-35 line-through hover:opacity-60 hover:bg-slate-800'
                  }`}
                  title="點擊隱藏/顯示淨申購趨勢線"
                >
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                  淨申購
                </button>
              </div>
            </div>

            {/* SVG line chart */}
            <div className="relative w-full flex-1 min-h-[180px] bg-slate-950/20 rounded-xl border border-slate-900/45 p-1">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full h-full select-none"
              >
                {/* Horizontal reference grid lines */}
                {[0, 1, 2, 3].map((val) => {
                  const y = chartPadding + (val * drawHeight) / 3;
                  const labelVal = Math.round(trendMaxVal - (val * trendMaxVal) / 3);
                  return (
                    <g key={val}>
                      <line 
                        x1={chartPadding} 
                        y1={y} 
                        x2={chartWidth - chartPadding} 
                        y2={y} 
                        stroke="#1e293b" 
                        strokeDasharray="3 3" 
                        strokeWidth={0.5} 
                      />
                      <text 
                        x={chartPadding - 6} 
                        y={y + 3} 
                        textAnchor="end" 
                        fill="#64748b" 
                        className="font-mono text-[9px]"
                      >
                        {labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical guides and interactive hover zones */}
                {trendPoints.map((pt, i) => (
                  <g key={i}>
                    {hoveredTrendIndex === i && (
                      <line 
                        x1={pt.x} 
                        y1={chartPadding} 
                        x2={pt.x} 
                        y2={chartHeight - chartPadding} 
                        stroke="#3b82f6" 
                        strokeOpacity={0.65}
                        strokeWidth={1}
                        strokeDasharray="2 2"
                      />
                    )}
                    <text 
                      x={pt.x} 
                      y={chartHeight - chartPadding + 14} 
                      textAnchor="middle" 
                      fill="#64748b" 
                      className="font-mono text-[8px] tracking-tighter"
                      transform={`rotate(-15, ${pt.x}, ${chartHeight - chartPadding + 12})`}
                    >
                      {pt.record.label.slice(-5)}
                    </text>
                  </g>
                ))}

                {/* Flow lines path element */}
                {showSubscription && (
                  <>
                    <path 
                      d={linePaths.subAreaPath} 
                      fill="url(#green-gradient)" 
                      opacity={0.06}
                    />
                    <path 
                      d={linePaths.subPath} 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                    />
                  </>
                )}
                {showRedemption && (
                  <path 
                    d={linePaths.redPath} 
                    fill="none" 
                    stroke="#f43f5e" 
                    strokeWidth={1.5} 
                    strokeDasharray="4 3" 
                  />
                )}
                {showNetFlow && (
                  <path 
                    d={linePaths.netPath} 
                    fill="none" 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                  />
                )}

                {/* Point indicators & trigger areas */}
                {trendPoints.map((pt, i) => {
                  const isHovered = hoveredTrendIndex === i;
                  return (
                    <g key={i}>
                      {/* Subscriptions Dot */}
                      {showSubscription && (
                        <circle 
                          cx={pt.x} 
                          cy={pt.subY} 
                          r={isHovered ? 5 : 2.5} 
                          fill="#10b981" 
                          stroke="#0b0f19" 
                          strokeWidth={isHovered ? 1.5 : 0.75}
                        />
                      )}
                      {/* Redemptions Dot */}
                      {showRedemption && (
                        <circle 
                          cx={pt.x} 
                          cy={pt.redY} 
                          r={isHovered ? 4.5 : 2} 
                          fill="#f43f5e" 
                          stroke="#0b0f19" 
                          strokeWidth={isHovered ? 1.25 : 0.5}
                        />
                      )}
                      {/* NetFlow Dot */}
                      {showNetFlow && (
                        <circle 
                          cx={pt.x} 
                          cy={pt.netY} 
                          r={isHovered ? 4.5 : 2} 
                          fill="#f59e0b" 
                          stroke="#0b0f19" 
                          strokeWidth={isHovered ? 1.25 : 0.5}
                        />
                      )}
                      
                      {/* Invisible coordinate interaction detector blocks */}
                      <rect 
                        x={pt.x - drawWidth / (trendSlice.length * 2)} 
                        y={chartPadding} 
                        width={drawWidth / trendSlice.length} 
                        height={drawHeight} 
                        fill="transparent" 
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredTrendIndex(i)}
                        onMouseLeave={() => setHoveredTrendIndex(null)}
                      />
                    </g>
                  );
                })}

                {/* Gradients declarations */}
                <defs>
                  <linearGradient id="green-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Dynamic Coordinate Hover Tooltip overlay */}
              {hoveredTrendIndex !== null && trendPoints[hoveredTrendIndex] && (
                <div 
                  className="absolute z-10 p-3 bg-slate-900 border border-slate-800 rounded-lg text-2xs md:text-xs font-mono select-none pointer-events-none shadow-xl max-w-[200px]"
                  style={{
                    left: `${Math.min(chartWidth - 190, Math.max(10, trendPoints[hoveredTrendIndex].x - 90))}px`,
                    top: '2px'
                  }}
                >
                  <p className="font-semibold text-slate-100 mb-1 border-b border-slate-800 pb-1 flex items-center justify-between">
                    <span>{trendPoints[hoveredTrendIndex].record.label}</span>
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded">波動分析</span>
                  </p>
                  
                  {showSubscription ? (
                    <>
                      <p className="text-emerald-400 font-medium flex justify-between items-center my-0.5">
                        <span>申購量:</span>
                        <span>{trendPoints[hoveredTrendIndex].record.totalSub.toLocaleString()} 萬</span>
                      </p>
                      <div className="pl-2 border-l border-emerald-500/30 text-[10px] text-slate-400 space-y-0.5">
                        <span>單筆: {trendPoints[hoveredTrendIndex].record.subSingle.toLocaleString()} 萬</span><br/>
                        <span>定期: {trendPoints[hoveredTrendIndex].record.subRSP.toLocaleString()} 萬</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-500 font-medium flex justify-between items-center my-0.5 line-through">
                      <span>申購量 (已隱藏):</span>
                      <span>{trendPoints[hoveredTrendIndex].record.totalSub.toLocaleString()} 萬</span>
                    </p>
                  )}

                  {showRedemption ? (
                    <p className="text-rose-400 font-medium flex justify-between items-center mt-1 pb-0.5 border-t border-slate-800/40">
                      <span>贖回量:</span>
                      <span>{trendPoints[hoveredTrendIndex].record.totalRed.toLocaleString()} 萬</span>
                    </p>
                  ) : (
                    <p className="text-slate-500 font-medium flex justify-between items-center mt-1 pb-0.5 border-t border-slate-800/40 line-through">
                      <span>贖回量 (已隱藏):</span>
                      <span>{trendPoints[hoveredTrendIndex].record.totalRed.toLocaleString()} 萬</span>
                    </p>
                  )}

                  <p className="text-slate-300 font-semibold flex justify-between items-center pt-1 border-t border-slate-800 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-amber-500 rounded-full inline-block"></span>
                      淨申購:
                    </span>
                    <span className={trendPoints[hoveredTrendIndex].record.netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {trendPoints[hoveredTrendIndex].record.netFlow >= 0 ? '+' : ''}
                      {trendPoints[hoveredTrendIndex].record.netFlow.toLocaleString()} 萬
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AUM Chart Box */}
          <div className="crypto-card-gradient rounded-2xl p-5 flex flex-col justify-between min-h-[350px]">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-blue-400" />
                AUM 資產總存量走勢
              </h3>
              <p className="text-xs text-slate-400">歷史平台規模水位 (單位: 億元)</p>
            </div>

            {/* SVG bar chart */}
            <div className="relative w-full flex-1 min-h-[180px] bg-slate-950/20 rounded-xl border border-slate-900/45 p-1 mt-4">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full h-full select-none"
              >
                {/* Horizontal reference lines */}
                {[0, 1, 2, 3].map((val) => {
                  const y = chartPadding + (val * drawHeight) / 3;
                  const labelVal = (aumMaxVal - (val * aumMaxVal) / 3).toFixed(1);
                  return (
                    <g key={val}>
                      <line 
                        x1={chartPadding} 
                        y1={y} 
                        x2={chartWidth - chartPadding} 
                        y2={y} 
                        stroke="#1e293b" 
                        strokeWidth={0.5} 
                      />
                      <text 
                        x={chartPadding - 6} 
                        y={y + 3} 
                        textAnchor="end" 
                        fill="#64748b" 
                        className="font-mono text-[9px]"
                      >
                        {labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Render high rendering bars */}
                {aumBars.map((bar, i) => {
                  const isHovered = hoveredAumIndex === i;
                  return (
                    <g key={i}>
                      <rect 
                        x={bar.x} 
                        y={bar.y} 
                        width={bar.width} 
                        height={Math.max(2, bar.height)} 
                        fill={isHovered ? "#60a5fa" : "#3b82f6"} 
                        opacity={isHovered ? 1 : 0.8}
                        rx={2} 
                        className="transition-all duration-150"
                      />
                      <text 
                        x={bar.x + bar.width / 2} 
                        y={chartHeight - chartPadding + 14} 
                        textAnchor="middle" 
                        fill="#64748b" 
                        className="font-mono text-[8px] tracking-tighter"
                        transform={`rotate(-20, ${bar.x + bar.width / 2}, ${chartHeight - chartPadding + 12})`}
                      >
                        {bar.record.label.slice(-5)}
                      </text>

                      {/* Bar interact elements */}
                      <rect 
                        x={bar.x - bar.width * 0.4} 
                        y={chartPadding} 
                        width={bar.width * 1.8} 
                        height={drawHeight} 
                        fill="transparent" 
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredAumIndex(i)}
                        onMouseLeave={() => setHoveredAumIndex(null)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Dynamic Mini Tooltip for AUM */}
              {hoveredAumIndex !== null && aumBars[hoveredAumIndex] && (
                <div 
                  className="absolute z-10 p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-2xs md:text-xs font-mono select-none pointer-events-none shadow-xl max-w-[170px]"
                  style={{
                    left: `${Math.min(chartWidth - 160, Math.max(10, aumBars[hoveredAumIndex].x - 65))}px`,
                    top: '2px'
                  }}
                >
                  <p className="font-semibold text-slate-100 border-b border-slate-800 pb-1 mb-1">
                    {aumBars[hoveredAumIndex].record.label}
                  </p>
                  <p className="text-blue-400 font-semibold flex justify-between gap-2">
                    <span>期末 AUM:</span>
                    <span>{aumBars[hoveredAumIndex].record.aum.toLocaleString('zh-TW', { minimumFractionDigits: 2 })} 億</span>
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Funnel KYC Segment + Historical Detail Log lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Funnel Card */}
          <div className="crypto-card-gradient rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-400" />
                  開戶手續狀態監控
                </h3>
                <div className="relative">
                  <select
                    value={selectedFunnelMonth}
                    onChange={(e) => setSelectedFunnelMonth(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-350 text-2xs md:text-xs rounded-lg px-2 py-0.5 focus:border-purple-500 focus:outline-none cursor-pointer hover:border-slate-700 transition"
                    title="切換統計月份"
                  >
                    <option value="latest">最新累計數據</option>
                    {availableFunnelMonths.map(month => (
                      <option key={month} value={month}>{month} 數據統計</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                {selectedFunnelMonth === 'latest' ? '開戶件數審件漏斗與流程效率監測' : `[${selectedFunnelMonth}] 歷史存量統計與漏斗審理狀態`}
              </p>

              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 mb-4 text-center">
                <p className="text-2xs text-slate-400 uppercase tracking-wider mb-1">
                  {selectedFunnelMonth === 'latest' ? '總申請件完成率 (累積)' : `${selectedFunnelMonth} 期末完成率`}
                </p>
                <p className="text-3xl sm:text-4xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 glow-green">
                  {funnelRecord.accRate}%
                </p>
                <p className="text-[10px] text-slate-500 mt-1.5">公式: 申請完成 / 歷史總申請戶數</p>
              </div>

              {/* Progress sliders */}
              <div id="kyc-stats-container" className="space-y-3.5">
                
                {/* Pending */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Hourglass className="w-3.5 h-3.5 text-blue-500" />
                      待審核中 (KYC專員)
                    </span>
                    <span className="font-mono font-semibold text-slate-200">{funnelRecord.accPending.toLocaleString()} 戶</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(1, (funnelRecord.accPending / funnelRecord.accTotal) * 100))}%` }}
                    ></div>
                  </div>
                </div>

                {/* Terminated/Success */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      審核完成 (已可下單)
                    </span>
                    <span className="font-mono font-semibold text-emerald-400">{funnelRecord.accSuccess.toLocaleString()} 戶</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5">
                    <div 
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${funnelRecord.accRate}%` }}
                    ></div>
                  </div>
                </div>

                {/* Missing documents */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      缺件通知 (等待補正)
                    </span>
                    <span className="font-mono font-semibold text-slate-200">{funnelRecord.accMissing.toLocaleString()} 戶</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5">
                    <div 
                      className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(1, (funnelRecord.accMissing / funnelRecord.accTotal) * 100))}%` }}
                    ></div>
                  </div>
                </div>

                {/* Review failure */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      審核未過 (拒絕或取消)
                    </span>
                    <span className="font-mono font-semibold text-slate-200">{funnelRecord.accFailed.toLocaleString()} 戶</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5">
                    <div 
                      className="bg-rose-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(1, (funnelRecord.accFailed / funnelRecord.accTotal) * 100))}%` }}
                    ></div>
                  </div>
                </div>

              </div>

              {/* Incremental Analysis block below progress lines */}
              {funnelDelta && (
                <div className="mt-4 p-3 bg-purple-950/20 border border-purple-900/30 rounded-xl">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">
                    <span>{funnelDelta.periodName} 新增件數</span>
                    <span className="text-[9px] bg-purple-500/15 px-1 rounded text-purple-350 font-normal">增量統計</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>總增件:</span>
                      <span className="font-mono text-purple-300 font-medium">+{funnelDelta.deltaTotal.toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>新待審:</span>
                      <span className="font-mono text-blue-400 font-medium">+{funnelDelta.deltaPending.toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>新完成:</span>
                      <span className="font-mono text-emerald-400 font-semibold">+{funnelDelta.deltaSuccess.toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>新缺件:</span>
                      <span className="font-mono text-amber-400 font-semibold">+{funnelDelta.deltaMissing.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="border-t border-slate-800/80 pt-3.5 mt-4 flex justify-between text-xs text-slate-400 font-medium">
              <span>期末累計總申請件數:</span>
              <span className="font-mono text-white font-bold">{funnelRecord.accTotal.toLocaleString()} 戶</span>
            </div>
          </div>

          {/* Historical Log Details Table Component */}
          <div className="crypto-card-gradient rounded-2xl p-5 lg:col-span-2 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                  平台時間維度數據明細總表
                </h3>
                <p className="text-xs text-slate-400">對應主要時間維度切換篩選 (呈現最新 6 筆數據明細)</p>
              </div>
              <button 
                id="export-csv-btn"
                onClick={handleExportCSV}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                匯出 CSV 報表
              </button>
            </div>

            <div id="table-scroll-frame" className="overflow-x-auto w-full flex-1">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-2xs uppercase tracking-wider bg-slate-900/40">
                    <th className="py-2.5 px-3">時間區段</th>
                    <th className="py-2.5 px-2 text-right">總申購量 (單筆/定期)</th>
                    <th className="py-2.5 px-2 text-right">總贖回量 (單筆/定期)</th>
                    <th className="py-2.5 px-2 text-right">淨申贖溢額</th>
                    <th className="py-2.5 px-2 text-right">期末規模 (AUM)</th>
                    <th className="py-2.5 px-3 text-right">開戶完成率</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-300 divide-y divide-slate-800/40">
                  {aggregatedData.slice(-6).reverse().map((item, idx) => {
                    const isPositive = item.netFlow > 0;
                    const isNegative = item.netFlow < 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-200 font-mono">{item.label}</td>
                        
                        <td className="py-2.5 px-2 text-right font-mono">
                          <span className="text-slate-100 font-medium">{item.totalSub.toLocaleString()} 萬</span>
                          <div className="text-[10px] text-slate-500">單:{item.subSingle} | 定:{item.subRSP}</div>
                        </td>

                        <td className="py-2.5 px-2 text-right font-mono">
                          <span className="text-slate-100 font-medium">{item.totalRed.toLocaleString()} 萬</span>
                          <div className="text-[10px] text-slate-500">單:{item.redSingle} | 定:{item.redRSP}</div>
                        </td>

                        <td className={`py-2.5 px-2 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-amber-400'
                        }`}>
                          {isPositive ? '+' : ''}{item.netFlow.toLocaleString()} 萬
                        </td>

                        <td className="py-2.5 px-2 text-right font-mono font-bold text-blue-400">
                          {item.aum.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 億
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                          <span className="font-semibold">{item.accRate}%</span>
                          <div className="text-[10px] text-slate-500">{item.accSuccess.toLocaleString()}/{item.accTotal.toLocaleString()}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="text-[10px] sm:text-2xs text-slate-500 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>* 單位：申購量、贖回量及溢額均為「萬元（TWD）」，AUM資產水位為「億元（TWD）」</span>
              <span>顯示最新 6 個時間節點的歷史紀錄明細</span>
            </div>
          </div>

        </div>

        {/* Global Footer Credits */}
        <footer className="text-center text-xs text-slate-600 mt-8 pb-4">
          基金平台數據智慧分析平台 &bull; 內置即時動態仿真數據更新引擎 &bull; 2026 版權所有
        </footer>

      </div>
    </div>
  );

  // Helper tab switch function
  function switchTimeframe(tf: Timeframe) {
    setTimeframe(tf);
    setHoveredTrendIndex(null);
    setHoveredAumIndex(null);
  }
}
