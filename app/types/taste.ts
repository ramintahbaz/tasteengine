export type MaterialSpec = {
  translucency: number; // 0-1: opacity/transparency
  blur: number; // 0-1: backdrop blur amount
  gloss: number; // 0-1: shininess/reflectivity
  texture: number; // 0-1: surface roughness/grain
  softness: number; // 0-1: soft shadows vs hard edges
  elevation: number; // 0-1: shadow depth/height
  contrast: number; // 0-1: light/dark contrast
  edgeHighlight: number; // 0-1: edge glow/border highlight
};

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
    fontFamily?: string;
    fontUrl?: string;
    moodCategory?: string; // e.g., "earthy", "futuristic", "luxury", etc.
  };
  iconography: {
    style: "minimal" | "rounded" | "sharp" | "filled" | "outlined" | "hand-drawn" | "geometric";
    weight: "thin" | "regular" | "bold";
    library: "feather" | "material" | "material-outlined" | "fa" | "material-sharp" | "heroicons";
    moodCategory?: string; // e.g., "earthy", "futuristic", "luxury", etc.
  };
  radius: "sharp" | "subtle" | "rounded" | "pill";
  spacing: "tight" | "medium" | "airy";
  material: MaterialSpec; // Always present
  materialStyle: "flat" | "glass" | "neuo" | "skeuo" | "solid" | string; // Material style identifier
  materialIntensity: number; // 0-1, how pronounced the material style is
};
export type RawTasteAnalysis = {
  // Content type identification
  contentType: "ui" | "product" | "photography" | "illustration" | "mixed";
  
  // Typography details (if text is present)
  typographyDetails?: {
    fontFamily?: string | null; // Try to identify actual font name
    fontCategory: "serif" | "sans-serif" | "mono" | "mixed";
    fontWeight: "light" | "regular" | "medium" | "bold";
    fontSize: "small" | "medium" | "large";
  } | null;
  
  // Color-based mood inference (when no typography exists)
  colorBasedMood?: string[] | null; // e.g., ["earthy", "natural", "warm"] or ["futuristic", "tech", "modern"]
  
  // Iconography details (if icons are present)
  iconographyDetails?: {
    style: "minimal" | "rounded" | "sharp" | "filled" | "outlined" | "hand-drawn" | "geometric";
    weight: "thin" | "regular" | "bold";
  } | null;
  
  // Direct color extraction
  dominantColor?: string; // Most common color (hex)
  textColor?: string | null; // Color of text if present
  secondaryColor?: string | null; // Second most common color
  backgroundColor?: string; // Background color
  
  // UI-specific details (if contentType === "ui")
  uiDetails?: {
    primaryButtonColor?: string | null;
    primaryButtonTextColor?: string | null;
    cardBackgroundColor?: string | null;
    borderRadius?: number | null; // Actual pixel value
  };
  
  // Existing fields
  overallMood: string[]; // ["futuristic", "luxury", "playful"]
  shapeSoftness: "soft" | "mixed" | "hard";
  edgeRoundnessScore: number; // 0 to 1, 0 = boxy, 1 = very rounded
  visualDensity: "sparse" | "medium" | "dense";
  colorFamilies: string[]; // ["deep green", "black", "gold"]
  lightDarkBias: "light" | "dark" | "mixed";
  
  // Material properties
  material?: {
    translucency: number;
    blur: number;
    gloss: number;
    texture: number;
    softness: number;
    elevation: number;
    contrast: number;
    edgeHighlight: number;
  };
  
  // Material style
  materialStyle?: "flat" | "glass" | "neuo" | "skeuo" | "solid" | string;
  materialIntensity?: number; // 0-1
};

export type TasteConfidence = {
  palette: number; // 0–1
  typography: number;
  radius: number;
  spacing: number;
  material: number; // 0–1
};

export type ClarifyingQuestion = {
  field: "palette" | "typography" | "radius" | "spacing" | "material" | "overall";
  question: string;
};

export type ModelTasteOutput = {
  rawAnalysis: RawTasteAnalysis;
  confidence: TasteConfidence;
  clarifyingQuestions: ClarifyingQuestion[];
};
