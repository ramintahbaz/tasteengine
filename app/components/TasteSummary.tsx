"use client";

import type React from "react";
import type { TasteFingerprint } from "@/app/types/taste";
// React Icons imports for iconography preview
import { FiCheck as FeatherCheck } from "react-icons/fi";
import { MdCheckCircle as MaterialCheck, MdCheckCircleOutline as MaterialOutlinedCheck } from "react-icons/md";
import { FaCheckCircle as FaCheck } from "react-icons/fa";
import { MdCheckCircle as MaterialSharpCheck } from "react-icons/md";
import { HiCheck as HeroCheck } from "react-icons/hi";

type Props = {
  fingerprint: TasteFingerprint;
};

export function TasteSummary({ fingerprint }: Props) {
  const { palette, typography, iconography, radius, spacing } = fingerprint;

  return (
    <div className="border border-zinc-800 rounded-xl p-4 space-y-6 bg-zinc-950">
      <h2 className="text-sm font-medium">Visual breakdown</h2>

      {/* Palette */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Palette
        </h3>
        <div className="flex flex-col gap-2 text-xs">
          <PaletteRow label="Primary" colors={palette.primary} />
          <PaletteRow label="Accent" colors={palette.accent} />
          <PaletteRow label="Neutral" colors={palette.neutral} />
        </div>
        <p className="text-[10px] text-zinc-500">
          Contrast: <span className="font-medium">{palette.contrast}</span>
        </p>
      </section>

      {/* Typography */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Typography vibe
        </h3>
        <TypographyPreview typography={typography} spacing={spacing} />
        <p className="text-[10px] text-zinc-500">
          {typography.category} • {typography.weight} • {typography.scale} •{" "}
          {typography.lineHeight}
          {typography.moodCategory && (
            <span className="block mt-1 text-zinc-400">
              Mood: <span className="font-medium capitalize">{typography.moodCategory}</span>
            </span>
          )}
        </p>
      </section>

      {/* Radius */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Radius
        </h3>
        <RadiusPreview radius={radius} />
        <p className="text-[10px] text-zinc-500">
          Corners: <span className="font-medium">{radius}</span>{" "}
          <span className="text-zinc-600">
            ({getRadiusPx(radius)})
          </span>
        </p>
      </section>

      {/* Spacing */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Spacing System
        </h3>
        <SpacingPreview spacing={spacing} />
      </section>

      {/* Iconography */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Iconography
        </h3>
        <IconographyPreview iconography={iconography} />
      </section>
    </div>
  );
}

function PaletteRow({
  label,
  colors,
}: {
  label: string;
  colors: string[];
}) {
  if (!colors || colors.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500 w-14">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {colors.map((color, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 rounded-md border border-zinc-800"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-zinc-400">{color}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type TypographyProps = TasteFingerprint["typography"];
type Spacing = TasteFingerprint["spacing"];

function TypographyPreview({
  typography,
  spacing,
}: {
  typography: TypographyProps;
  spacing: Spacing;
}) {
  const categoryClass =
    typography.category === "serif"
      ? "font-serif"
      : typography.category === "mono"
      ? "font-mono"
      : "font-sans";

  const weightClass =
    typography.weight === "light"
      ? "font-light"
      : typography.weight === "medium"
      ? "font-medium"
      : typography.weight === "bold"
      ? "font-bold"
      : "font-normal";

  const sizeClass =
    typography.scale === "small"
      ? "text-sm"
      : typography.scale === "large"
      ? "text-xl"
      : "text-base";

  const leadingClass =
    typography.lineHeight === "tight"
      ? "leading-tight"
      : typography.lineHeight === "airy"
      ? "leading-relaxed"
      : "leading-normal";

  const paddingClass =
    spacing === "tight"
      ? "px-3 py-2"
      : spacing === "airy"
      ? "px-6 py-4"
      : "px-4 py-3";

  return (
    <div
      className={`bg-zinc-900/60 rounded-lg border border-zinc-800 ${paddingClass}`}
    >
      <p 
        className={`${categoryClass} ${weightClass} ${sizeClass} ${leadingClass}`}
        style={{ 
          fontFamily: typography.fontFamily 
            ? `"${typography.fontFamily}", ${typography.category === "serif" ? "serif" : typography.category === "mono" ? "monospace" : "sans-serif"}`
            : undefined
        }}
      >
        The quick brown fox jumps over the lazy dog.
      </p>
      <p className="text-[10px] text-zinc-500 mt-2">
        Sample of your typography + spacing inside a component.
        {typography.fontFamily && (
          <span className="block mt-1">Font: {typography.fontFamily}</span>
        )}
      </p>
    </div>
  );
}

function getRadiusPx(radius: TasteFingerprint["radius"]): string {
  switch (radius) {
    case "sharp":
      return "0px";
    case "subtle":
      return "6px";
    case "rounded":
      return "12px";
    case "pill":
      return "9999px";
    default:
      return "6px";
  }
}

function RadiusPreview({ radius }: { radius: TasteFingerprint["radius"] }) {
  const radiusClass =
    radius === "sharp"
      ? "rounded-none"
      : radius === "subtle"
      ? "rounded-md"
      : radius === "rounded"
      ? "rounded-xl"
      : "rounded-full";

  return (
    <div className="flex gap-4 items-center">
      <div
        className={`w-24 h-14 bg-zinc-900/60 border border-zinc-800 ${radiusClass}`}
      />
      <button
        className={`text-[11px] px-4 py-2 bg-zinc-100 text-zinc-900 ${radiusClass}`}
      >
        Button
      </button>
    </div>
  );
}

type SpacingSummary = {
  primary: number;
  secondary: number | null;
  gap: number;
  containerPadding: number;
};

function getSpacingSummary(spacing: Spacing): SpacingSummary {
  // Map spacing values to pixel-based design system scales
  // Based on common design system patterns (4px, 8px base units)
  switch (spacing) {
    case "tight":
      return {
        primary: 4,
        secondary: 8,
        gap: 8,
        containerPadding: 16,
      };
    case "medium":
      return {
        primary: 8,
        secondary: 16,
        gap: 16,
        containerPadding: 24,
      };
    case "airy":
      return {
        primary: 16,
        secondary: 24,
        gap: 24,
        containerPadding: 32,
      };
    default:
      // Fallback to medium
      return {
        primary: 8,
        secondary: 16,
        gap: 16,
        containerPadding: 24,
      };
  }
}

function SpacingPreview({ spacing }: { spacing: Spacing }) {
  const summary = getSpacingSummary(spacing);

  return (
    <div className="space-y-1">
      <div className="text-xs text-zinc-200 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">Primary spacing unit:</span>
          <span className="font-medium">{summary.primary}px</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">Secondary unit:</span>
          <span className="font-medium">
            {summary.secondary !== null ? `${summary.secondary}px` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">Typical gap:</span>
          <span className="font-medium">{summary.gap}px</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">Max container padding:</span>
          <span className="font-medium">{summary.containerPadding}px</span>
        </div>
      </div>
    </div>
  );
}

type IconographyProps = TasteFingerprint["iconography"];

function getIconComponent(library: string) {
  switch (library) {
    case "feather":
      return FeatherCheck;
    case "material":
      return MaterialCheck;
    case "material-outlined":
      return MaterialOutlinedCheck;
    case "fa":
      return FaCheck;
    case "material-sharp":
      return MaterialSharpCheck;
    case "heroicons":
    default:
      return HeroCheck;
  }
}

function IconographyPreview({ iconography }: { iconography: IconographyProps }) {
  const IconComponent = getIconComponent(iconography.library);
  const strokeWidth = iconography.weight === "thin" ? 1.5 : 
                     iconography.weight === "bold" ? 3 : 2;

  // React Icons props - ensure black color
  const iconProps: any = {
    size: 32,
  };

  // Feather icons support strokeWidth prop
  if (iconography.library === "feather") {
    iconProps.strokeWidth = iconography.style === "filled" ? 0 : strokeWidth;
  }

  // Style object - force black color using CSS that works for all icon libraries
  const iconStyle: React.CSSProperties = {
    color: "#000000",
    stroke: iconography.style === "filled" ? "none" : "#000000",
    fill: iconography.style === "filled" ? "#000000" : "none",
    strokeWidth: iconography.style === "filled" ? 0 : strokeWidth,
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-lg bg-white border-2 border-zinc-300 flex items-center justify-center shadow-sm" style={{ minWidth: "64px", minHeight: "64px" }}>
        <div 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            width: "100%", 
            height: "100%",
            color: "#000000"
          }}
        >
          <div className="iconography-preview-icon" style={{ color: "#000000" }}>
            <IconComponent 
              {...iconProps}
              style={iconStyle}
            />
          </div>
        </div>
      </div>
      <div className="text-xs text-zinc-300">
        <div className="font-medium capitalize">{iconography.style}</div>
        <div className="text-[10px] text-zinc-500">
          {iconography.weight} • {iconography.library}
          {iconography.moodCategory && (
            <span className="block mt-1 text-zinc-400">
              Mood: <span className="font-medium capitalize">{iconography.moodCategory}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}