/**
 * Interactive TUI for reviewing and selecting Copilot suggestions.
 *
 * Renders a scrollable list of suggestions with detail view and key bindings.
 * Built with ink (React for CLIs).
 */

import { useState, useCallback, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { Suggestion } from '../types/index.js';

// ── Types ────────────────────────────────────────────────────────────────────

export type ItemStatus = 'pending' | 'apply' | 'ignore';

export interface SuggestionItem {
  suggestion: Suggestion;
  status: ItemStatus;
  editedCode: string | null;
}

interface AppProps {
  initialItems: SuggestionItem[];
  initialSelectedIndex: number;
  onDone: (items: SuggestionItem[]) => void;
  onEditRequest: (index: number, items: SuggestionItem[]) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum visible items in the list before scrolling kicks in. */
const MAX_VISIBLE = 10;

// ── Main component ───────────────────────────────────────────────────────────

export function App({
  initialItems,
  initialSelectedIndex,
  onDone,
  onEditRequest,
}: AppProps) {
  const [items, setItems] = useState<SuggestionItem[]>(initialItems);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const { exit } = useApp();

  // ── Derived state ────────────────────────────────────────────────────────

  const selected = items[selectedIndex];
  const total = items.length;

  const counts = useMemo(() => {
    let reviewed = 0;
    let toApply = 0;
    let ignored = 0;
    for (const item of items) {
      if (item.status !== 'pending') reviewed++;
      if (item.status === 'apply') toApply++;
      if (item.status === 'ignore') ignored++;
    }
    return { reviewed, toApply, ignored };
  }, [items]);

  // ── Scrolling ────────────────────────────────────────────────────────────

  const visibleCount = Math.min(total, MAX_VISIBLE);
  const scrollOffset = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(visibleCount / 2),
      total - visibleCount,
    ),
  );
  const visibleItems = items.slice(scrollOffset, scrollOffset + visibleCount);
  const hasScrollUp = scrollOffset > 0;
  const hasScrollDown = scrollOffset + visibleCount < total;

  // ── Actions ──────────────────────────────────────────────────────────────

  const toggleApply = useCallback((index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              status: (item.status === 'apply' ? 'pending' : 'apply') as ItemStatus,
            }
          : item,
      ),
    );
  }, []);

  const toggleIgnore = useCallback((index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              status: (item.status === 'ignore' ? 'pending' : 'ignore') as ItemStatus,
            }
          : item,
      ),
    );
  }, []);

  const applyAllPending = useCallback(() => {
    setItems((prev) =>
      prev.map((item) =>
        item.status === 'pending'
          ? { ...item, status: 'apply' as ItemStatus }
          : item,
      ),
    );
  }, []);

  // ── Key handling ─────────────────────────────────────────────────────────

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(total - 1, i + 1));
    } else if (key.return) {
      toggleApply(selectedIndex);
    } else if (input === ' ') {
      toggleIgnore(selectedIndex);
    } else if (input === 'e' || input === 'E') {
      onEditRequest(selectedIndex, items);
      exit();
    } else if (input === 'a' || input === 'A') {
      applyAllPending();
    } else if (input === 'q' || input === 'Q') {
      onDone(items);
      exit();
    }
  });

  // ── Render ───────────────────────────────────────────────────────────────

  const currentCode =
    selected?.editedCode ?? selected?.suggestion.code ?? '';

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        justifyContent="center"
      >
        <Text bold color="cyan">
          INTERACTIVE SUGGESTION REVIEW
        </Text>
      </Box>

      {/* Scroll-up indicator */}
      {hasScrollUp && (
        <Box justifyContent="center">
          <Text dimColor>▲ {scrollOffset} more above</Text>
        </Box>
      )}

      {/* Suggestion list */}
      <Box marginY={1} flexDirection="column">
        {visibleItems.map((item, vi) => {
          const actualIndex = vi + scrollOffset;
          const isSelected = actualIndex === selectedIndex;
          const statusIcon =
            item.status === 'apply'
              ? '✓'
              : item.status === 'ignore'
                ? '✗'
                : '●';
          const statusColor =
            item.status === 'apply'
              ? 'green'
              : item.status === 'ignore'
                ? 'red'
                : 'gray';

          return (
            <Box key={actualIndex}>
              <Text color="cyan">{isSelected ? '▶ ' : '  '}</Text>
              <Text color={statusColor}>{statusIcon} </Text>
              <Text color={statusColor} bold={isSelected}>
                [{item.status.toUpperCase().padEnd(6)}]
              </Text>
              <Text> </Text>
              <Text bold={isSelected}>
                {cap(item.suggestion.type)} &quot;{item.suggestion.name}&quot;
              </Text>
              <Text dimColor>
                {' '}for {trunc(item.suggestion.pattern, 36)}
              </Text>
              {item.editedCode !== null && (
                <Text color="yellow" italic>
                  {' '}(edited)
                </Text>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Scroll-down indicator */}
      {hasScrollDown && (
        <Box justifyContent="center">
          <Text dimColor>
            ▼ {total - scrollOffset - visibleCount} more below
          </Text>
        </Box>
      )}

      {/* Divider */}
      <Text dimColor>{'━'.repeat(68)}</Text>

      {/* Detail view */}
      {selected && (
        <Box flexDirection="column" marginY={1}>
          <Box>
            <Text dimColor>Pattern: </Text>
            <Text>{selected.suggestion.pattern}</Text>
          </Box>
          <Box>
            <Text dimColor>Type:    </Text>
            <Text>{cap(selected.suggestion.type)}</Text>
          </Box>
          {selected.suggestion.safety && (
            <Box>
              <Text dimColor>Safety:  </Text>
              <Text
                color={
                  selected.suggestion.safety === 'safe'
                    ? 'green'
                    : selected.suggestion.safety === 'warning'
                      ? 'yellow'
                      : 'red'
                }
              >
                {cap(selected.suggestion.safety)}
              </Text>
            </Box>
          )}

          <Box marginTop={1} flexDirection="column">
            <Text dimColor>Suggested Code:</Text>
            <Box marginTop={1} flexDirection="column" paddingLeft={4}>
              {currentCode.split('\n').map((line, i) => (
                <Text key={i} color="green">
                  {line}
                </Text>
              ))}
            </Box>
          </Box>

          {selected.suggestion.explanation && (
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>Explanation:</Text>
              <Text>   {selected.suggestion.explanation}</Text>
            </Box>
          )}

          {selected.editedCode !== null && (
            <Box marginTop={1}>
              <Text color="yellow" italic>
                (code was edited)
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Divider */}
      <Text dimColor>{'━'.repeat(68)}</Text>

      {/* Footer: key bindings + status */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          ↑/↓ move │ Enter apply │ Space ignore │ E edit │ A apply all │ Q quit
        </Text>
        <Text dimColor>
          {counts.reviewed} of {total} reviewed │ {counts.toApply} to apply │{' '}
          {counts.ignored} ignored
        </Text>
      </Box>
    </Box>
  );
}

// ── Local utility helpers ────────────────────────────────────────────────────

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function trunc(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 3) + '...';
}
