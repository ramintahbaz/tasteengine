export type TasteFingerprint = {
  palette: {
    primary: string[];
    accent: string[];
    neutral: string[];
    contrast: "low" | "medium" | "high";
  };
  typography: {
    category: "serif" | "sans-serif" | "mono" | "mixed";
    weight: "light" | "regular" | "medium" | "bold";
    scale: "small" | "medium" | "large";
    lineHeight: "tight" | "normal" | "airy";
  };
  radius: "sharp" | "subtle" | "rounded" | "pill";
  spacing: "tight" | "medium" | "airy";
};






