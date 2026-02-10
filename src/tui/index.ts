/**
 * Interactive TUI entry point.
 *
 * Provides `renderInteractiveTUI()` which launches an ink-based terminal UI
 * for reviewing, editing, and selecting suggestions. Falls back gracefully
 * when the terminal is not a TTY (e.g. CI, piped output).
 *
 * The TUI re-renders after each external editor session so the user can
 * edit suggestion code, return to the list, and continue reviewing.
 */

import os from 'node:os';
import path from 'node:path';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import type { Suggestion, ShellType } from '../types/index.js';
import type { SuggestionItem, ItemStatus } from './App.js';

// ── Public types ─────────────────────────────────────────────────────────────

export interface InteractiveResult {
  /** Suggestions the user marked for apply (may include edited code). */
  selected: Suggestion[];
  /** Suggestions the user explicitly ignored. */
  ignored: Suggestion[];
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Render the interactive TUI for reviewing and selecting suggestions.
 *
 * @returns The user's selections after they quit the TUI.
 *
 * **Fallback:** If stdout/stdin is not a TTY, returns all suggestions
 * as selected (mimics non-interactive behaviour) and prints a note.
 */
export async function renderInteractiveTUI(
  suggestions: Suggestion[],
  shell: ShellType,
): Promise<InteractiveResult> {
  // ── TTY guard ──────────────────────────────────────────────────────────
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    const { default: chalk } = await import('chalk');
    console.error(
      chalk.yellow(
        'Note: Interactive mode skipped (not a TTY). Falling back to non-interactive output.',
      ),
    );
    return { selected: suggestions, ignored: [] };
  }

  // ── Dynamic imports (ink is ESM-only) ──────────────────────────────────
  const { render } = await import('ink');
  const React = await import('react');
  const { App } = await import('./App.js');

  // ── Persistent state (survives editor re-entry) ────────────────────────
  let state: SuggestionItem[] = suggestions.map((s) => ({
    suggestion: s,
    status: 'pending' as ItemStatus,
    editedCode: null,
  }));
  let selectedIndex = 0;

  return new Promise<InteractiveResult>((resolve) => {
    let resolved = false;

    /** Resolve the outer promise with the user's selections. */
    function finish(items: SuggestionItem[]) {
      if (resolved) return;
      resolved = true;

      const selected = items
        .filter((i) => i.status === 'apply')
        .map((i) =>
          i.editedCode !== null
            ? { ...i.suggestion, code: i.editedCode }
            : i.suggestion,
        );
      const ignored = items
        .filter((i) => i.status === 'ignore')
        .map((i) => i.suggestion);

      resolve({ selected, ignored });
    }

    /** Render (or re-render) the ink app with current state. */
    function renderLoop() {
      let editIndex = -1;

      const element = React.createElement(App, {
        initialItems: state,
        initialSelectedIndex: selectedIndex,
        onDone: (items: SuggestionItem[]) => {
          state = items;
          finish(items);
        },
        onEditRequest: (index: number, items: SuggestionItem[]) => {
          editIndex = index;
          state = items;
          selectedIndex = index;
        },
      });

      const instance = render(element);

      instance.waitUntilExit().then(() => {
        if (editIndex >= 0 && !resolved) {
          // ── Launch external editor ─────────────────────────────────
          const code =
            state[editIndex].editedCode ??
            state[editIndex].suggestion.code;

          const newCode = launchEditor(code, shell);
          if (newCode !== null) {
            state = state.map((item, i) =>
              i === editIndex ? { ...item, editedCode: newCode } : item,
            );
          }

          // Re-render the TUI with updated state
          renderLoop();
        } else if (!resolved) {
          // User pressed Ctrl+C or terminal closed — exit gracefully
          finish(state);
        }
      });
    }

    renderLoop();
  });
}

// ── Editor launcher ──────────────────────────────────────────────────────────

/**
 * Open the suggestion code in an external editor and return the modified text.
 *
 * Uses `$EDITOR`, `$VISUAL`, or a platform default (notepad / vi).
 * Returns `null` if the editor process fails.
 */
function launchEditor(code: string, shell: ShellType): string | null {
  const ext = shell === 'powershell' ? '.ps1' : '.sh';
  const tmpFile = path.join(
    os.tmpdir(),
    `dotfiles-coach-edit-${Date.now()}${ext}`,
  );

  try {
    writeFileSync(tmpFile, code, 'utf-8');

    const editor =
      process.env.EDITOR ||
      process.env.VISUAL ||
      (process.platform === 'win32' ? 'notepad' : 'vi');

    execSync(`${editor} "${tmpFile}"`, { stdio: 'inherit' });

    return readFileSync(tmpFile, 'utf-8');
  } catch {
    return null;
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}
