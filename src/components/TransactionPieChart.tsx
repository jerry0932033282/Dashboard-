import { useState } from 'react';
import { FundDataRecord } from '../types';
import { PieChart, ListFilter, Percent } from 'lucide-react';

interface TransactionPieChartProps {
  record: FundDataRecord & { label?: string };
}

export function TransactionPieChart({ record }: TransactionPieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Raw segment definitions - values correspond to different types of transactions
  const segments = [
    {
      id: 0,
      name: '單筆申購',
      value: record.subSingle,
      color: '#10b981', // emerald-500
      hoverColor: '#34d399', // emerald-400
      textColor: 'text-emerald-600',
      textHoverColor: 'text-emerald-500',
      activeBg: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
      dotClass: 'bg-emerald-500'
    },
    {
      id: 1,
      name: '定期定額申購',
      value: record.subRSP,
      color: '#2563eb', // blue-600
      hoverColor: '#60a5fa', // blue-400
      textColor: 'text-blue-600',
      textHoverColor: 'text-blue-500',
      activeBg: 'bg-blue-50',
      borderClass: 'border-blue-200',
      dotClass: 'bg-blue-600'
    },
    {
      id: 2,
      name: '單筆贖回',
      value: record.redSingle,
      color: '#f43f5e', // rose-500
      hoverColor: '#fb7185', // rose-400
      textColor: 'text-rose-600',
      textHoverColor: 'text-rose-500',
      activeBg: 'bg-rose-50',
      borderClass: 'border-rose-200',
      dotClass: 'bg-rose-500'
    },
    {
      id: 3,
      name: '定期贖回',
      value: record.redRSP,
      color: '#d97706', // amber-600
      hoverColor: '#fbbf24', // amber-400
      textColor: 'text-amber-600',
      textHoverColor: 'text-amber-500',
      activeBg: 'bg-amber-50',
      borderClass: 'border-amber-200',
      dotClass: 'bg-amber-600'
    }
  ];

  const totalTransactions = segments.reduce((sum, item) => sum + item.value, 0);

  // SVG Dimension setups
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 95;
  const rInner = 65;

  // Render mathematical coordinates for wedges
  let accumulatedAngle = 0;
  const processedSlices = segments.map((item) => {
    const percentage = totalTransactions > 0 ? item.value / totalTransactions : 0;
    const angleDelta = percentage * 360;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + angleDelta;
    accumulatedAngle = endAngle;

    // Helper coordinates
    const getPoint = (angle: number, radius: number) => {
      // Offset by -90 to start path at 12 o'clock
      const radians = ((angle - 90) * Math.PI) / 180;
      return {
        x: cx + radius * Math.cos(radians),
        y: cy + radius * Math.sin(radians)
      };
    };

    const pOuterStart = getPoint(startAngle, rOuter);
    const pOuterEnd = getPoint(endAngle, rOuter);
    const pInnerEnd = getPoint(endAngle, rInner);
    const pInnerStart = getPoint(startAngle, rInner);

    const largeArcFlag = angleDelta > 180 ? 1 : 0;

    // Edge check for 100% full slice
    let pathD = '';
    if (percentage >= 0.999) {
      pathD = `
        M ${cx} ${cy - rOuter}
        A ${rOuter} ${rOuter} 0 1 1 ${cx} ${cy + rOuter}
        A ${rOuter} ${rOuter} 0 1 1 ${cx} ${cy - rOuter}
        M ${cx} ${cy - rInner}
        A ${rInner} ${rInner} 0 1 0 ${cx} ${cy + rInner}
        A ${rInner} ${rInner} 0 1 0 ${cx} ${cy - rInner}
      `;
    } else if (percentage > 0) {
      pathD = `
        M ${pOuterStart.x} ${pOuterStart.y}
        A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${pOuterEnd.x} ${pOuterEnd.y}
        L ${pInnerEnd.x} ${pInnerEnd.y}
        A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${pInnerStart.x} ${pInnerStart.y}
        Z
      `;
    }

    return {
      ...item,
      percentage: (percentage * 100).toFixed(1),
      pathD,
      startAngle,
      endAngle,
      angleDelta
    };
  });

  // Decide what center information to overlay
  const activeFocusItem = hoveredIndex !== null ? processedSlices[hoveredIndex] : null;

  return (
    <div className="crypto-card-gradient rounded-2xl p-5 flex flex-col justify-between min-h-[330px]">
      
      {/* Box Header Segment */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-indigo-500" />
            本期申購與贖回交易構成
          </h3>
          <p className="text-xs text-slate-500">
            {record.label || record.date} 交易組成佔比分配 ({totalTransactions > 0 ? `總交易量 ${totalTransactions.toLocaleString()} 萬` : '無申購贖回交易'})
          </p>
        </div>
        <div className="flex items-center gap-1 text-[10px] sm:text-xs font-mono text-slate-400 bg-slate-50 border border-slate-200/60 rounded-lg px-2.5 py-1">
          <ListFilter className="w-3 h-3 text-slate-400" />
          <span>動態佔比</span>
        </div>
      </div>

      {totalTransactions === 0 ? (
        // Empty state guard
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <svg width={130} height={130} className="text-slate-200 mb-3" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="4 4" />
            <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="2" strokeDashopacity="0.5" />
          </svg>
          <p className="text-xs text-slate-400 font-medium font-sans">此模擬基準區間目前尚無交易異動</p>
        </div>
      ) : (
        // Layout structure
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 flex-1 py-1">
          
          {/* Left Arc Visualization Circle */}
          <div className="relative select-none flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {/* Outer stroke path loops */}
              {processedSlices.map((slice, index) => {
                if (slice.angleDelta <= 0) return null;
                const isHovered = hoveredIndex === index;
                return (
                  <path
                    key={slice.id}
                    d={slice.pathD}
                    fill={isHovered ? slice.hoverColor : slice.color}
                    opacity={hoveredIndex === null || isHovered ? 1.0 : 0.40}
                    className="transition-all duration-200 cursor-pointer outline-none"
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2.5 : 1}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}
            </svg>

            {/* Centered Dynamic stats labels overlay inside the Donut hole */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              {activeFocusItem ? (
                <>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider font-sans leading-none">
                    {activeFocusItem.name}
                  </span>
                  <span className={`text-xl sm:text-2xl font-extrabold font-mono tracking-tight mt-1.5 ${activeFocusItem.textColor}`}>
                    {activeFocusItem.percentage}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans mt-0.5">
                    {activeFocusItem.value.toLocaleString()} 萬元
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">
                    申贖總交易額
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-800 tracking-tight mt-1.5">
                    {totalTransactions.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans mt-0.5">
                    萬元（總計）
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right Detailed legends lists */}
          <div className="flex-1 w-full flex flex-col gap-2.5">
            {processedSlices.map((item, index) => {
              const isHovered = hoveredIndex === index;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
                    isHovered 
                      ? `${item.activeBg} ${item.borderClass} shadow-xs scale-[1.02]` 
                      : 'border-transparent hover:bg-slate-50 hover:border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${item.dotClass} transition-transform ${isHovered ? 'scale-110' : ''}`} />
                    <span className={`text-xs font-semibold ${isHovered ? 'text-slate-800' : 'text-slate-600'}`}>
                      {item.name}
                    </span>
                  </div>
                  
                  <div className="text-right font-mono flex items-center gap-2.5">
                    <span className={`text-xs font-bold ${isHovered ? item.textColor : 'text-slate-700'}`}>
                      ${item.value.toLocaleString()} 萬
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 hover:bg-slate-200/50 transition-colors px-1.5 py-0.5 rounded-md min-w-[45px] text-center">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Decorative caption banner */}
      <div className="text-[10px] text-slate-400 mt-3 pt-3.5 border-t border-slate-100 flex items-center justify-between">
        <span>* 佔比 = 項目交易量 / 當期申贖交易總額</span>
        <span className="flex items-center gap-0.5 text-[9px] text-indigo-500 font-semibold font-mono">
          <Percent className="w-2.5 h-2.5" /> 本期結構分析
        </span>
      </div>

    </div>
  );
}
