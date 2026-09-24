// Profile accent colors: named presets plus user-picked custom hex values.
// accent_color in profiles stores either a preset name ("emerald") or a
// normalized lowercase hex ("#6ee7b7"). Keep the server PATCH validation and
// every renderer on this helper so they agree.

export const ACCENT_COLORS = {
  arboreal: "#8fd34f",
  emerald: "#6ee7b7",
  jungle: "#4ade80",
  blue: "#60a5fa",
  purple: "#c084fc",
  red: "#fb7185",
  orange: "#fb923c",
  gold: "#facc15",
  teal: "#2dd4bf",
  neutral: "#d1d5db",
} as const;

export type AccentName = keyof typeof ACCENT_COLORS;
export const ACCENT_NAMES = new Set<string>(Object.keys(ACCENT_COLORS));
export const DEFAULT_ACCENT_HEX = ACCENT_COLORS.emerald;

const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

/** Returns the normalized lowercase #rrggbb hex for a valid custom color, or null. */
export function normalizeCustomAccentHex(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!HEX_RE.test(raw)) return null;
  let hex = raw.toLowerCase();
  if (hex.length === 4) hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  return hex;
}

/** True when the stored accent value is a custom hex rather than a preset name. */
export function isCustomAccent(value: unknown): boolean {
  return normalizeCustomAccentHex(value) !== null;
}

/** Resolve a stored accent_color to a usable hex color string. */
export function resolveAccentColor(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw && raw in ACCENT_COLORS) return ACCENT_COLORS[raw as AccentName];
  return normalizeCustomAccentHex(raw) ?? DEFAULT_ACCENT_HEX;
}

/** Preset list for the picker UI: [id, label, hex]. */
export const ACCENT_PRESETS = (Object.keys(ACCENT_COLORS) as AccentName[]).map((id) => [
  id,
  id[0].toUpperCase() + id.slice(1),
  ACCENT_COLORS[id],
] as const);
