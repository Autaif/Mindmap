import type { Transition } from 'framer-motion';

/**
 * Shared transition strings and framer-motion spring presets. `T_*` values
 * go on plain CSS `transition`; `SPRING_*` values go on a motion component's
 * `transition` prop.
 */

/** Overshoot curve for the repulsion spring-back (see NodeBubble / OrbView). */
export const EASE_OVERSHOOT = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export const DUR_CONTROL = '0.15s'; // every hover/press/focus swap
export const DUR_BUBBLE = '0.2s'; // node bubble state change (select, drag)
/** Repulsion settle — magnitude tuned against MAX_PUSH (52px) in lib/repulsion.ts. */
export const DUR_SETTLE = '0.22s';

export const T_COLOR = `color ${DUR_CONTROL}`;
export const T_BACKGROUND = `background ${DUR_CONTROL}`;
export const T_BORDER = `border-color ${DUR_CONTROL}`;
/** Explicit property list instead of `all` — `all` also transitions layout properties, a repaint trap. */
export const T_CONTROL = `border-color ${DUR_CONTROL}, color ${DUR_CONTROL}, background ${DUR_CONTROL}`;
export const T_BUTTON = `background ${DUR_CONTROL}, box-shadow ${DUR_CONTROL}`;
export const T_BUBBLE = `box-shadow ${DUR_BUBBLE}, border-color ${DUR_BUBBLE}, background ${DUR_BUBBLE}`;
/** Only for the item NOT currently being dragged — pair with `isDragging ? 'none' : T_SETTLE`. */
export const T_SETTLE = `left ${DUR_SETTLE} ${EASE_OVERSHOOT}, top ${DUR_SETTLE} ${EASE_OVERSHOOT}`;

/** Drawers, panels, cards, filter bar. */
export const SPRING_PANEL: Transition = { type: 'spring', stiffness: 320, damping: 30 };
/** Node bubble mount/unmount. */
export const SPRING_BUBBLE: Transition = { type: 'spring', stiffness: 280, damping: 22 };
/** Reduced-motion substitute: instant, no spring. */
export const NO_MOTION: Transition = { duration: 0 };
