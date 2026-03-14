export const COLOR_MAP: Record<string, string> = {
  rouge: "#ef4444",
  red: "#ef4444",
  bleu: "#3b82f6",
  blue: "#3b82f6",
  blanc: "#ffffff",
  white: "#ffffff",
  noir: "#18181b",
  black: "#18181b",
  jaune: "#eab308",
  yellow: "#eab308",
  vert: "#22c55e",
  green: "#22c55e",
  gris: "#71717a",
  grey: "#71717a",
  gray: "#71717a",
  marine: "#1e3a8a",
  navy: "#1e3a8a",
  ciel: "#7dd3fc",
  skyblue: "#7dd3fc",
  bordeaux: "#7f1d1d",
  wine: "#7f1d1d",
  orange: "#f97316",
  rose: "#ec4899",
  pink: "#ec4899",
  violet: "#8b5cf6",
  purple: "#8b5cf6",
  marron: "#78350f",
  brown: "#78350f",
  or: "#fbbf24",
  gold: "#fbbf24",
  argent: "#e4e4e7",
  silver: "#e4e4e7",
  turquoise: "#06b6d4",
  cyan: "#06b6d4",
  fuchsia: "#d946ef",
  lime: "#84cc16",
  indigo: "#6366f1",
  teal: "#14b8a6",
};

export const parseJerseyColors = (
  input: string | null | undefined,
): string[] => {
  if (!input) return [];

  // Lowcase and remove accent for easier matching
  const normalized = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s/]/g, " ");

  // Split by common separators: "et", "/", ",", and spaces
  const parts = normalized.split(/\s+et\s+|\s*\/\s*|\s*,\s*|\s+/);

  const colors: string[] = [];

  parts.forEach((part) => {
    const trimmed = part.trim();

    if (COLOR_MAP[trimmed]) {
      colors.push(COLOR_MAP[trimmed]);
    }
  });

  return colors;
};
