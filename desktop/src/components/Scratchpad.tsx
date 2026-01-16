import { useCallback, useEffect, useState, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { useScratchpad, useSaveScratchpad } from "../lib/hooks";

type Props = {
  home?: string;
  workspaceId: string;
};

export function Scratchpad({ home, workspaceId }: Props) {
  const { data: content, isLoading, error } = useScratchpad(home, workspaceId);
  const saveMutation = useSaveScratchpad(home);
  const [value, setValue] = useState("");
  const [dirty, setDirty] = useState(false);

  // Refs to track current state for cleanup
  const valueRef = useRef(value);
  const dirtyRef = useRef(dirty);
  const workspaceIdRef = useRef(workspaceId);

  // Keep refs in sync
  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  useEffect(() => { workspaceIdRef.current = workspaceId; }, [workspaceId]);

  // Save immediately on unmount if dirty
  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        saveMutation.mutate({ wsId: workspaceIdRef.current, content: valueRef.current });
      }
    };
  }, [saveMutation]);

  // Reset dirty state when workspace changes
  useEffect(() => {
    setDirty(false);
  }, [workspaceId]);

  // Sync with loaded content
  useEffect(() => {
    if (content !== undefined && !dirty) {
      setValue(content);
    }
  }, [content, dirty, workspaceId]);

  // Debounced save
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      saveMutation.mutate({ wsId: workspaceId, content: value });
      setDirty(false); // Mark as saved after successful save
    }, 1000);
    return () => clearTimeout(timer);
  }, [value, dirty, workspaceId, saveMutation]);

  const onChange = useCallback((val: string) => {
    setValue(val);
    setDirty(true);
  }, []);

  if (isLoading) return <div className="muted" style={{ padding: 16 }}>Loading scratchpad...</div>;
  if (error) return <div className="inline-error" style={{ padding: 16 }}>Error loading scratchpad: {error.message}</div>;

  // Theme for prose-like editing (Obsidian-style)
  const proseTheme = EditorView.theme({
    "&": {
      height: "100%",
      fontSize: "15px",
      fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif)",
      color: "var(--text-primary)",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-scroller": {
      overflow: "auto",
      height: "100%",
    },
    ".cm-content": {
      padding: "16px 20px",
      minHeight: "100%",
      lineHeight: "1.65",
      caretColor: "var(--text-primary)",
      fontFamily: "inherit",
    },
    ".cm-line": {
      padding: "1px 0",
      fontFamily: "inherit",
    },
    ".cm-placeholder": {
      color: "var(--text-tertiary)",
      fontStyle: "normal",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--text-primary)",
    },
    // Markdown syntax - subtle like Obsidian
    ".tok-heading": {
      fontWeight: "600",
    },
    ".tok-strong": {
      fontWeight: "600",
    },
    ".tok-emphasis": {
      fontStyle: "italic",
    },
    ".tok-link": {
      color: "var(--accent)",
    },
    ".tok-url, .tok-meta": {
      color: "var(--text-tertiary)",
    },
  });

  return (
    <div className="scratchpad-container" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)" }}>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <CodeMirror
          value={value}
          height="100%"
          style={{ flex: 1, overflow: "hidden" }}
          extensions={[markdown(), EditorView.lineWrapping, proseTheme]}
          onChange={onChange}
          className="scratchpad-editor"
          basicSetup={{
              lineNumbers: false,
              foldGutter: false,
              highlightActiveLine: false,
          }}
          placeholder="Start writing..."
        />
      </div>
      <div className="scratchpad-footer" style={{
          padding: "4px 12px",
          fontSize: "11px",
          color: "var(--text-tertiary)",
          borderTop: "1px solid var(--border-primary)",
          display: "flex",
          justifyContent: "space-between",
          background: "var(--bg-secondary)",
          flexShrink: 0,
      }}>
          <span>Markdown</span>
          <span>{saveMutation.isPending ? "Saving..." : dirty ? "Unsaved" : "Saved"}</span>
      </div>
    </div>
  );
}
