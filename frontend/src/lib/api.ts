// PyTrace -- Axios API client for FastAPI backend

import axios from 'axios';
import type { TraceRequest, TraceResult } from '../types/trace';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const client = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// --- /trace ------------------------------------------------------------------

export async function postTrace(payload: TraceRequest): Promise<TraceResult> {
  const response = await client.post<TraceResult>('/trace', payload);
  return response.data;
}

// --- /analyze ----------------------------------------------------------------

export interface AnalyzeResult {
  time: string;
  space: string;
  pattern: string;
  explanation: string;
}

export async function postAnalyze(code: string): Promise<AnalyzeResult> {
  // AI calls can take up to 45s -- override the default 15s timeout
  const response = await client.post<AnalyzeResult>('/analyze', { code }, { timeout: 60_000 });
  return response.data;
}

// --- /snippets ---------------------------------------------------------------

export interface SnippetCreateResult {
  token: string;
  url: string;
}

export interface SnippetData {
  code: string;
  inputs: Record<string, unknown>;
  initial_step: number;
}

export async function createSnippet(
  code: string,
  inputs: Record<string, unknown>,
  initial_step: number,
): Promise<SnippetCreateResult> {
  const response = await client.post<SnippetCreateResult>('/snippets', {
    code,
    inputs,
    initial_step,
  });
  return response.data;
}

export async function getSnippet(token: string): Promise<SnippetData> {
  const response = await client.get<SnippetData>(`/snippets/${token}`);
  return response.data;
}
