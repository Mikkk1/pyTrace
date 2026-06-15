// PyTrace - Detachable visualizer popout controls: sidebar header toggle
// button and the "open in separate window" reattach notice (Phase 7 Section 4).

import { ExternalLink } from 'lucide-react';

interface PopoutToggleButtonProps {
  popoutOpen: boolean;
  onToggle: () => void;
}

export function PopoutToggleButton({ popoutOpen, onToggle }: PopoutToggleButtonProps) {
  return (
    <div className="shrink-0 px-3 py-1.5 flex items-center justify-between border-b border-[#2d2d2d]">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">VISUALIZATION</span>
      <button
        type="button"
        onClick={onToggle}
        title={popoutOpen ? 'Close popout window' : 'Open in separate window'}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-colors ${
          popoutOpen ? 'bg-green-700/30 text-green-400' : 'text-[#6b6b6b] hover:bg-[#2a2a2a] hover:text-[#cccccc]'
        }`}
      >
        <ExternalLink size={13} />
        {popoutOpen && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
      </button>
    </div>
  );
}

interface PopoutNoticeProps {
  onReattach: () => void;
}

export function PopoutNotice({ onReattach }: PopoutNoticeProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
      <p className="text-[#9d9d9d] text-sm">Visualization open in separate window &rarr;</p>
      <button
        type="button"
        onClick={onReattach}
        className="px-3 py-1 rounded bg-[#007acc] hover:bg-[#1a8ad4] text-white text-xs font-semibold transition-colors"
      >
        Reattach
      </button>
    </div>
  );
}
