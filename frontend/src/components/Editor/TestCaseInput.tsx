// PyTrace - Test case input panel (VS Code colors)

import { useState, useEffect, useCallback } from 'react';
import { useTraceStore } from '../../store/traceStore';

function parseParams(code: string): string[] {
  const match = code.match(/^\s*def\s+\w+\s*\(([^)]*)\)/m);
  if (!match || !match[1].trim()) return [];
  return match[1]
    .split(',')
    .map((p) => p.trim().split(':')[0].trim().split('=')[0].trim())
    .filter((p) => p.length > 0 && p !== 'self' && p !== 'cls');
}

const DEFAULTS: Record<string, string> = {
  nums: '[-1,0,1,2,-1,-4]', target: '9', n: '5',
  arr: '[3,1,4,1,5]', s: '"hello"', k: '2', x: '10',
};
const defaultFor = (name: string) => DEFAULTS[name] ?? 'null';

interface Props {
  onChange: (inputs: Record<string, unknown> | null, error: string | null) => void;
}

export default function TestCaseInput({ onChange }: Props) {
  const code = useTraceStore((s) => s.code) ?? '';
  const [params, setParams] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [rawJson, setRawJson] = useState('{"nums": [2, 7, 11, 15], "target": 9}');

  useEffect(() => {
    const newParams = parseParams(code);
    setParams(newParams);
    if (newParams.length > 0) {
      setValues((prev) => {
        const next: Record<string, string> = {};
        for (const p of newParams) next[p] = prev[p] ?? defaultFor(p);
        return next;
      });
    }
  }, [code]);

  const emit = useCallback(
    (currentParams: string[], currentValues: Record<string, string>, fallback: string) => {
      if (currentParams.length === 0) {
        try { onChange(JSON.parse(fallback), null); }
        catch { onChange(null, 'Invalid JSON'); }
        return;
      }
      const result: Record<string, unknown> = {};
      for (const p of currentParams) {
        try { result[p] = JSON.parse(currentValues[p] ?? 'null'); }
        catch { onChange(null, `Bad JSON for "${p}"`); return; }
      }
      onChange(result, null);
    },
    [onChange],
  );

  useEffect(() => { emit(params, values, rawJson); }, [params, values, rawJson, emit]);

  const inputCls = "bg-[#3c3c3c] border border-[#555] rounded px-2 py-0.5 text-xs font-mono text-[#d4d4d4] focus:outline-none focus:border-[#007acc] placeholder-[#6b6b6b]";

  if (params.length === 0) {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-[#858585] text-xs shrink-0">Inputs</span>
        <input
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
          spellCheck={false}
          className={`flex-1 min-w-0 ${inputCls}`}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
      {params.map((p) => (
        <label key={p} className="flex items-center gap-1 shrink-0">
          <span className="text-[#9cdcfe] text-xs font-mono">{p}</span>
          <span className="text-[#6b6b6b] text-xs">=</span>
          <input
            value={values[p] ?? ''}
            onChange={(e) => setValues((prev) => ({ ...prev, [p]: e.target.value }))}
            spellCheck={false}
            className={`w-28 ${inputCls}`}
          />
        </label>
      ))}
    </div>
  );
}
