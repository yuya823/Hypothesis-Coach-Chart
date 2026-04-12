/**
 * シンプルなSVGアイコンセット
 * 絵文字の代わりに使う軽量アイコン
 */

const size = 16;
const sw = 1.8; // stroke-width

export function IconSearch({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function IconFlask({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 3h6M10 3v6.5L4 18a1 1 0 00.87 1.5h14.26A1 1 0 0020 18l-6-8.5V3" />
    </svg>
  );
}

export function IconPuzzle({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 01-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 10-3.214 3.214c.446.166.855.497.925.968a.979.979 0 01-.276.837l-1.61 1.611a2.404 2.404 0 01-1.705.707 2.402 2.402 0 01-1.704-.706l-1.568-1.568a1.026 1.026 0 00-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 11-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 00-.289-.877l-1.568-1.568A2.402 2.402 0 011.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 103.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0112 2c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.969a2.5 2.5 0 113.237 3.237c-.464.18-.894.527-.967 1.02z" />
    </svg>
  );
}

export function IconUser({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconActivity({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function IconWind({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.7 7.7a2.5 2.5 0 111.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1111 8H2" /><path d="M12.6 19.4A2 2 0 1014 16H2" />
    </svg>
  );
}

export function IconEye({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconRuler({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21.34 6.46l-3.8-3.8a2 2 0 00-2.83 0L2.34 15.03a2 2 0 000 2.83l3.8 3.8a2 2 0 002.83 0L21.34 9.29a2 2 0 000-2.83z" />
      <path d="M7.5 13.5L10 11M5.83 15.17L8.33 12.67M11.17 9.83L13.67 7.33M12.83 8.17L15.33 5.67" />
    </svg>
  );
}

export function IconEdit({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function IconRefreshCw({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" />
      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
    </svg>
  );
}

export function IconMuscle({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 18.5a3.5 3.5 0 117 0M6 18.5V15M13 18.5V15" />
      <path d="M6 15a5 5 0 013.5-4.77M13 15a5 5 0 00-3.5-4.77" />
      <path d="M9.5 5.5a2.5 2.5 0 015 0 2.5 2.5 0 01-5 0z" />
    </svg>
  );
}

export function IconTarget({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function IconHome({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function IconLink({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function IconX({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function IconPlus({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconChevronDown({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function IconArrowRight({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function IconSpark({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2L9.1 8.6 2 9.2l5.2 4.6L5.8 21 12 17.3 18.2 21l-1.4-7.2L22 9.2l-7.1-.6z" />
    </svg>
  );
}

export function IconBone({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18.6 9.82c-.52-.21-1.15-.25-1.64.07-.46.3-.75.83-.75 1.39v1.44c0 .56.29 1.09.75 1.39.49.32 1.12.28 1.64.07A3 3 0 0121 17a3 3 0 01-3 3 3 3 0 01-2.82-1.6c-.21-.52-.25-1.15.07-1.64.3-.46.83-.75 1.39-.75h1.44" />
      <path d="M5.4 14.18c.52.21 1.15.25 1.64-.07.46-.3.75-.83.75-1.39v-1.44c0-.56-.29-1.09-.75-1.39-.49-.32-1.12-.28-1.64-.07A3 3 0 013 7a3 3 0 013-3 3 3 0 012.82 1.6c.21.52.25 1.15-.07 1.64-.3.46-.83.75-1.39.75H5.92" />
    </svg>
  );
}

export function IconLungs({ s = size, ...props }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2v10" /><path d="M8 12c-2 0-4 2-4 5s1 5 4 5c1.5 0 3-.5 4-2" /><path d="M16 12c2 0 4 2 4 5s-1 5-4 5c-1.5 0-3-.5-4-2" />
    </svg>
  );
}

// Icon map for category keys
export const OBS_ICONS = {
  static: IconUser,
  dynamic: IconActivity,
  breathing: IconWind,
  sensory: IconEye,
  appearance: IconRuler,
  freeNote: IconEdit,
};

export const TEST_ICONS = {
  mobility: IconRefreshCw,
  muscle_stability: IconActivity,
  sensory: IconEye,
  breathing_pressure: IconLungs,
  appearance_body: IconRuler,
  custom: IconPlus,
};

export const EVAL_ICONS = {
  structure_mobility: IconBone,
  muscle_function: IconActivity,
  motor_control: IconTarget,
  sensory_input: IconEye,
  breathing_pressure: IconLungs,
  lifestyle: IconHome,
};
