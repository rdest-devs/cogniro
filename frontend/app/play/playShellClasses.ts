/**
 * Participant column shell: `mx-auto` centering, `w-full` base, width by orientation.
 * Landscape / desktop: fixed 390px + `border-x`.
 * Portrait &lt; sm: full width, no side borders.
 * Portrait ≥ sm: min(80vw, 720px).
 */
const PLAY_USER_SHELL_LAYOUT =
  'mx-auto w-full max-w-[390px] border-x border-[var(--border)] portrait:max-sm:max-w-none portrait:max-sm:border-x-0 portrait:sm:max-w-[min(80vw,720px)] flex flex-col bg-[var(--page-bg)]';

/** Full-viewport play column (e.g. `/play`). */
export const PLAY_USER_SHELL_CLASS = `${PLAY_USER_SHELL_LAYOUT} min-h-screen min-h-dvh`;

/**
 * Same width/border rules as {@link PLAY_USER_SHELL_CLASS}, for a column inside a
 * parent that already owns vertical space (e.g. nested layout under a full-width nav).
 */
export const PLAY_USER_SHELL_EMBEDDED_CLASS = `${PLAY_USER_SHELL_LAYOUT} min-h-0 flex-1`;
