// PyTrace — Monaco editor with line highlight for the current trace step

import { useRef, useEffect, useCallback } from 'react';
import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { useTraceStore } from '../../store/traceStore';

const HIGHLIGHT_CLASS = 'pytrace-current-line';
const STYLE_ID = 'pytrace-highlight-style';

// Inject the decoration CSS once into <head>
function ensureHighlightStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      background: rgba(220, 220, 170, 0.10) !important;
      border-left: 2px solid #dcdcaa !important;
    }
    .pytrace-glyph {
      background: #dcdcaa;
      border-radius: 50%;
      width: 6px !important;
      height: 6px !important;
      margin-top: 7px;
      margin-left: 4px;
    }
  `;
  document.head.appendChild(style);
}

export default function CodeEditor() {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);

  const code = useTraceStore((s) => s.code);
  const setCode = useTraceStore((s) => s.setCode);
  const currentStep = useTraceStore((s) => s.currentStep);

  // Apply / remove line highlight whenever the current step changes
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    // Clear previous decoration
    if (decorationsRef.current) {
      decorationsRef.current.clear();
      decorationsRef.current = null;
    }

    if (!currentStep) return;

    const lineNumber = currentStep.line;

    decorationsRef.current = editor.createDecorationsCollection([
      {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: HIGHLIGHT_CLASS,
          glyphMarginClassName: 'pytrace-glyph',
        },
      },
    ]);

    editor.revealLineInCenterIfOutsideViewport(lineNumber);
  }, [currentStep]);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // VS Code Dark+ color token rules
    monaco.editor.defineTheme('pytrace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword',           foreground: '569cd6' },
        { token: 'keyword.control',   foreground: 'c586c0' },
        { token: 'string',            foreground: 'ce9178' },
        { token: 'string.escape',     foreground: 'd7ba7d' },
        { token: 'number',            foreground: 'b5cea8' },
        { token: 'comment',           foreground: '6a9955', fontStyle: 'italic' },
        { token: 'type',              foreground: '4ec9b0' },
        { token: 'identifier',        foreground: '9cdcfe' },
        { token: 'delimiter',         foreground: 'd4d4d4' },
        { token: 'operator',          foreground: 'd4d4d4' },
        { token: 'function',          foreground: 'dcdcaa' },
        { token: 'variable',          foreground: '9cdcfe' },
        { token: 'variable.name',     foreground: '9cdcfe' },
        { token: 'constant.language', foreground: '569cd6' },
        { token: 'support.function',  foreground: 'dcdcaa' },
      ],
      colors: {
        'editor.background':              '#1e1e1e',
        'editor.foreground':              '#d4d4d4',
        'editor.lineHighlightBackground': '#2a2d2e',
        'editor.selectionBackground':     '#264f78',
        'editorLineNumber.foreground':    '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editorCursor.foreground':        '#aeafad',
        'editor.findMatchBackground':     '#515c6a',
        'editorGutter.background':        '#1e1e1e',
        'editorWidget.background':        '#252526',
        'editorIndentGuide.background1':  '#404040',
        'editorBracketMatch.background':  '#0d3a58',
        'editorBracketMatch.border':      '#888888',
      },
    });
    monaco.editor.setTheme('pytrace-dark');

    ensureHighlightStyles();
  }, []);

  return (
    <MonacoEditor
      height="100%"
      language="python"
      theme="pytrace-dark"
      value={code}
      onChange={(value) => setCode(value ?? '')}
      onMount={handleMount}
      options={{
        fontSize: 13,
        fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
        fontLigatures: true,
        lineNumbers: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'line',
        wordWrap: 'on',
        padding: { top: 10, bottom: 10 },
        glyphMargin: true,
        folding: false,
        automaticLayout: true,
        lineHeight: 22,
        letterSpacing: 0.3,
        renderWhitespace: 'none',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        bracketPairColorization: { enabled: true },
        guides: { indentation: true, bracketPairs: false },
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
      }}
    />
  );
}
