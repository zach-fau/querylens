'use client';

import { useSyncExternalStore, useRef, useEffect } from 'react';
import Editor, { type OnMount, type Monaco } from '@monaco-editor/react';
import type { editor, Position, IRange } from 'monaco-editor';

/**
 * Represents an error to display in the editor
 */
export interface EditorError {
  /** Error message to display */
  message: string;
  /** Line number (1-based) */
  line?: number;
  /** Column number (1-based) */
  column?: number;
  /** End line for multi-line errors */
  endLine?: number;
  /** End column for errors spanning multiple characters */
  endColumn?: number;
}

export interface MonacoEditorProps {
  /** SQL content value */
  value: string;
  /** Callback when content changes */
  onChange?: (value: string) => void;
  /** Editor height (default: 300px) */
  height?: string | number;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Errors to display in the editor */
  errors?: EditorError[];
}

// Dark mode detection using useSyncExternalStore to avoid setState in effect
function subscribeToDarkMode(callback: () => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getServerSnapshot(): boolean {
  return false; // Default to light mode on server
}

function getClientSnapshot(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Monaco Editor wrapper configured for SQL editing.
 * Automatically detects dark mode from system preference.
 * Supports error highlighting via the errors prop.
 */
export function MonacoEditor({
  value,
  onChange,
  height = '300px',
  readOnly = false,
  className = '',
  errors = [],
}: MonacoEditorProps) {
  const isDarkMode = useSyncExternalStore(
    subscribeToDarkMode,
    getClientSnapshot,
    getServerSnapshot
  );

  // Store refs to editor and monaco for setting markers
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Update error markers when errors change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const monaco = monacoRef.current;

    if (errors.length === 0) {
      // Clear all markers when there are no errors
      monaco.editor.setModelMarkers(model, 'sql-parser', []);
      return;
    }

    // Convert EditorError array to Monaco markers
    const markers: editor.IMarkerData[] = errors.map((error) => {
      const startLine = error.line ?? 1;
      const startColumn = error.column ?? 1;
      const endLine = error.endLine ?? startLine;
      // If no end column, highlight to end of line
      const endColumn = error.endColumn ?? model.getLineMaxColumn(endLine);

      return {
        severity: monaco.MarkerSeverity.Error,
        message: error.message,
        startLineNumber: startLine,
        startColumn: startColumn,
        endLineNumber: endLine,
        endColumn: endColumn,
      };
    });

    monaco.editor.setModelMarkers(model, 'sql-parser', markers);
  }, [errors]);

  const handleEditorMount: OnMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    // Store refs for use in useEffect
    editorRef.current = editorInstance;
    monacoRef.current = monaco;
    // Configure SQL language features
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: editor.ITextModel, position: Position) => {
        const word = model.getWordUntilPosition(position);
        const range: IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // Basic SQL keywords for autocompletion
        const keywords = [
          'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER',
          'ON', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'AS', 'ORDER', 'BY',
          'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'INTO', 'VALUES',
          'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER',
          'INDEX', 'UNIQUE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
          'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CASE', 'WHEN',
          'THEN', 'ELSE', 'END', 'UNION', 'ALL', 'EXISTS', 'BETWEEN', 'LIKE',
          'ASC', 'DESC', 'WITH', 'RECURSIVE', 'CTE', 'OVER', 'PARTITION',
          'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'COALESCE', 'NULLIF', 'CAST',
        ];

        const suggestions = keywords.map((keyword) => ({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          range,
        }));

        return { suggestions };
      },
    });

    // Focus the editor
    editorInstance.focus();
  };

  const handleChange = (newValue: string | undefined) => {
    onChange?.(newValue ?? '');
  };

  return (
    <div className={`rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
      <Editor
        height={height}
        defaultLanguage="sql"
        language="sql"
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme={isDarkMode ? 'vs-dark' : 'vs'}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          readOnly,
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          padding: { top: 8, bottom: 8 },
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          suggest: {
            showKeywords: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          folding: true,
          foldingHighlight: true,
          bracketPairColorization: {
            enabled: true,
          },
          guides: {
            indentation: true,
            bracketPairs: true,
          },
        }}
        loading={
          <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Loading editor...
            </div>
          </div>
        }
      />
    </div>
  );
}
