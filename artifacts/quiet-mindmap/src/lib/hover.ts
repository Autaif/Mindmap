import type { CSSProperties, FocusEvent, MouseEvent } from 'react';

/**
 * Shared hover/focus style-swap helper, replacing the hand-rolled
 * `onMouseEnter`/`onMouseLeave` (and input `onFocus`/`onBlur`) pairs that
 * re-typed the "off" value from the element's static style object at every
 * call site — a rename hazard if the resting style ever changed without the
 * hover pair being updated to match.
 *
 * Reads the resting value off the DOM element itself on enter/focus, and
 * restores exactly that on leave/blur, so there is only ever one source of
 * truth for the "off" state.
 */

type SwapProps = Partial<Pick<CSSProperties, 'color' | 'background' | 'backgroundColor' | 'borderColor' | 'boxShadow' | 'opacity'>>;

const saved = new WeakMap<HTMLElement, SwapProps>();

function apply(el: HTMLElement, next: SwapProps) {
  if (saved.has(el)) return; // guard re-entrant enter/focus while already swapped
  const prev: SwapProps = {};
  for (const key of Object.keys(next) as (keyof SwapProps)[]) {
    prev[key] = el.style[key] as never;
  }
  saved.set(el, prev);
  Object.assign(el.style, next);
}

function restore(el: HTMLElement) {
  const prev = saved.get(el);
  if (!prev) return;
  Object.assign(el.style, prev);
  saved.delete(el);
}

/** Spread onto any element: `<button {...hoverStyle({ color: ACCENT_TEXT })}>`. */
export function hoverStyle(on: SwapProps) {
  return {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => apply(e.currentTarget, on),
    onMouseLeave: (e: MouseEvent<HTMLElement>) => restore(e.currentTarget),
  };
}

/** Same swap, for the focus/blur border-color pattern on inputs. */
export function focusStyle(on: SwapProps) {
  return {
    onFocus: (e: FocusEvent<HTMLElement>) => apply(e.currentTarget, on),
    onBlur: (e: FocusEvent<HTMLElement>) => restore(e.currentTarget),
  };
}
