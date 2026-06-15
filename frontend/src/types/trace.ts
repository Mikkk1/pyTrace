// PyTrace — TypeScript types matching backend Pydantic schemas

export interface StackFrame {
  name: string;
  line: number;
  depth: number;
}

export interface TraceStep {
  line: number;
  locals: Record<string, unknown>;
  call_stack: StackFrame[];
  event: 'line' | 'call' | 'return' | 'exception';
  return_value?: unknown;
  changed_vars: string[];
}

export interface TraceResult {
  steps: TraceStep[];
  total_steps: number;
  error?: string;
  notes?: string[];  // preprocessing transformations applied (e.g. "Stripped self")
}

export interface TraceRequest {
  code: string;
  inputs: Record<string, unknown>;
}
