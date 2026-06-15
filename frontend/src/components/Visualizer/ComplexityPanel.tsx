// PyTrace - Collapsible complexity panel (VS Code colors)

import { useState } from 'react';
import type { AnalyzeResult } from '../../lib/api';

interface Props { result: AnalyzeResult | null; isLoading: boolean; error: string | null; }

export default function ComplexityPanel({ result, isLoading, error }: Props) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-[#3c3c3c] rounded overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#2d2d2d] hover:bg-[#333333] transition-colors text-[11px] font-semibold text-[#858585] uppercase tracking-widest"
      >
        <span>Complexity</span>
        <span className="text-[#6b6b6b]">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="bg-[#1e1e1e] px-2.5 py-2 text-xs">
          {isLoading && <p className="text-[#858585] animate-pulse">Analysing...</p>}
          {error && !isLoading && <p className="text-[#f44747]">{error}</p>}
          {!isLoading && !error && !result && <p className="text-[#6b6b6b]">Run code then click Analyse.</p>}
          {result && !isLoading && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge label="Time" value={result.time} color="#dcdcaa" />
                <Badge label="Space" value={result.space} color="#9cdcfe" />
                <span className="text-[#6b6b6b] italic text-[11px]">{result.pattern}</span>
              </div>
              <p className="text-[#cccccc] text-[11px] leading-relaxed">{result.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 border rounded px-1.5 py-0.5 font-mono text-[11px]"
      style={{ color, borderColor: `${color}40`, background: `${color}12` }}>
      <span className="text-[#6b6b6b]">{label}:</span>
      <span>{value}</span>
    </span>
  );
}
