"use client";

import type { TasteFingerprint } from "@/app/types/taste";
import { MaterialControlTile } from "@/app/components/MaterialControlTile";
// React Icons imports
import { FiCheck as FeatherCheck } from "react-icons/fi"; // Feather icons
import { MdCheckCircle as MaterialCheck, MdCheckCircleOutline as MaterialOutlinedCheck } from "react-icons/md"; // Material Design
import { FaCheckCircle as FaCheck } from "react-icons/fa"; // Font Awesome
import { MdCheckCircle as MaterialSharpCheck } from "react-icons/md"; // Material Sharp (using regular for now)
import { HiCheck as HeroCheck } from "react-icons/hi"; // Heroicons

type SampleProps = {
  title: string;
  fingerprint: TasteFingerprint | null;
  styleTextUsed?: string;
};

// Helper function to check if material style matches style text keywords
function doesMaterialStyleMatchStyleText(materialStyle: string, styleText: string): boolean {
  const style = materialStyle.toLowerCase();
  const text = styleText.toLowerCase();
  
  // Check for common material style keywords
  const keywords: Record<string, string[]> = {
    "skeuo": ["skeuo", "skeuomorphic", "skeuomorphism", "3d", "depth", "bevel", "realistic"],
    "neuo": ["neuo", "neumorphic", "neumorphism", "soft", "extruded", "embossed"],
    "glass": ["glass", "glassmorphic", "glassmorphism", "translucent", "frosted", "blur"],
    "solid": ["solid", "hardware", "crisp", "bold", "defined"],
    "flat": ["flat", "minimal", "simple", "clean"]
  };
  
  // Check if any keyword matches
  for (const [key, terms] of Object.entries(keywords)) {
    if (style.includes(key)) {
      // Material style matches this category, check if styleText contains related keywords
      return terms.some(term => text.includes(term));
    }
  }
  
  // If material style doesn't match known categories, still show if styleText was provided
  return true;
}

// Helper to calculate luminance of a color
function getLuminance(hex: string): number {
  // Remove # if present
  const color = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Calculate relative luminance
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Helper to determine if a color is light or dark
function getContrastColor(hex: string): string {
  const luminance = getLuminance(hex);
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Helper to get icon component based on library
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

export function SampleUI({ title, fingerprint, styleTextUsed = "" }: SampleProps) {
  const bg = fingerprint?.palette.neutral[0] || "#111827";
  let primary = fingerprint?.palette.primary?.[0];
  
  // Debug: log what we got from fingerprint
  console.log("🔍 Button color debug:", {
    rawPrimary: fingerprint?.palette.primary?.[0],
    accent: fingerprint?.palette.accent,
    neutral: fingerprint?.palette.neutral
  });
  
  // Always avoid the fallback blue - replace it immediately
  if (primary === "#2563EB") {
    console.log("🚫 Rejecting blue fallback color");
    primary = undefined; // Force it to use alternative logic
  }
  
  // If primary is missing or was the fallback blue, try to use a better color
  if (!primary) {
    // Check if we have accent colors first
    if (fingerprint?.palette.accent && fingerprint.palette.accent.length > 0) {
      primary = fingerprint.palette.accent[0];
      console.log("✅ Using accent color:", primary);
    } else {
      // Use a contrasting color based on background brightness
      const bgLuminance = getLuminance(bg);
      primary = bgLuminance > 0.5 ? "#000000" : "#FFFFFF";
      console.log("✅ Using contrasting color:", primary, "(bg luminance:", bgLuminance + ")");
    }
  }
  
  // Ensure button color is different from background
  if (primary === bg) {
    console.log("⚠️ Primary matches background, adjusting...");
    // If primary matches background, use accent or a contrasting color
    if (fingerprint?.palette.accent && fingerprint.palette.accent.length > 0) {
      primary = fingerprint.palette.accent[0];
    } else {
      // Use a contrasting color based on background brightness
      const bgLuminance = getLuminance(bg);
      primary = bgLuminance > 0.5 ? "#000000" : "#FFFFFF";
    }
  }
  
  console.log("🎨 Final button color:", primary);
  const accent = fingerprint?.palette.accent[0] || null;

  const radiusClass =
    fingerprint?.radius === "sharp"
      ? "rounded-none"
      : fingerprint?.radius === "subtle"
      ? "rounded-md"
      : fingerprint?.radius === "rounded"
      ? "rounded-xl"
      : fingerprint?.radius === "pill"
      ? "rounded-full"
      : "rounded-lg";

  const paddingClass =
    fingerprint?.spacing === "tight"
      ? "p-3"
      : fingerprint?.spacing === "airy"
      ? "p-6"
      : "p-4";

  return (
    <div className="border border-zinc-800 rounded-xl p-4 space-y-4 bg-zinc-950">
      <h2 className="text-sm font-medium">{title}</h2>
      
      {/* Card and Material Demo side by side */}
      <div className="flex justify-center gap-6 flex-wrap">
        {/* Original Card */}
        <div
          className="rounded-lg bg-white"
          style={{ 
            width: "346px",
            minWidth: "346px",
            padding: "0",
            backgroundColor: fingerprint ? bg : "#FFFFFF",
            borderRadius: fingerprint?.radius === "sharp" ? "0" :
                         fingerprint?.radius === "subtle" ? "6px" :
                         fingerprint?.radius === "rounded" ? "12px" :
                         fingerprint?.radius === "pill" ? "9999px" : "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
          }}
        >
        {/* Icon and Text */}
        <div className="flex items-start" style={{ padding: "24px" }}>
          {fingerprint && accent && accent.length > 0 ? (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: accent[0] }}
            >
              {(() => {
                const IconComponent = getIconComponent(fingerprint.iconography.library);
                const iconColor = getContrastColor(accent[0]);
                const strokeWidth = fingerprint.iconography.weight === "thin" ? 1.5 : 
                                   fingerprint.iconography.weight === "bold" ? 3 : 2;
                return (
                  <IconComponent 
                    size={20} 
                    color={iconColor}
                    strokeWidth={strokeWidth}
                    style={{ 
                      strokeWidth: fingerprint.iconography.style === "filled" ? 0 : strokeWidth,
                      fill: fingerprint.iconography.style === "filled" ? iconColor : "none"
                    }}
                  />
                );
              })()}
            </div>
          ) : (
            <div 
              className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"
            >
              {(() => {
                const IconComponent = fingerprint ? getIconComponent(fingerprint.iconography.library) : HeroCheck;
                const iconColor = getContrastColor("#10B981");
                const strokeWidth = fingerprint?.iconography.weight === "thin" ? 1.5 : 
                                   fingerprint?.iconography.weight === "bold" ? 3 : 2;
                return (
                  <IconComponent 
                    size={20} 
                    color={iconColor}
                    strokeWidth={strokeWidth}
                    style={{ 
                      strokeWidth: fingerprint?.iconography.style === "filled" ? 0 : strokeWidth,
                      fill: fingerprint?.iconography.style === "filled" ? iconColor : "none"
                    }}
                  />
                );
              })()}
            </div>
          )}
          
          <div className="flex-1 min-w-0" style={{ paddingLeft: "12px" }}>
            {/* Headline - 22px bold */}
            <h1
              className="font-bold mb-2"
              style={{
                fontSize: "22px",
                color: fingerprint ? getContrastColor(bg) : "#000000",
                fontFamily: fingerprint?.typography.fontFamily 
                  ? `"${fingerprint.typography.fontFamily}", ${fingerprint.typography.category === "serif" ? "serif" : fingerprint.typography.category === "mono" ? "monospace" : "sans-serif"}`
                  : undefined
              }}
            >
              This is a headline title
            </h1>
            
            {/* Body text - 14px */}
            <p
              className="leading-relaxed"
              style={{
                fontSize: "14px",
                color: fingerprint ? getContrastColor(bg) : "#000000",
                fontFamily: fingerprint?.typography.fontFamily 
                  ? `"${fingerprint.typography.fontFamily}", ${fingerprint.typography.category === "serif" ? "serif" : fingerprint.typography.category === "mono" ? "monospace" : "sans-serif"}`
                  : undefined
              }}
            >
              This is body text
            </p>
          </div>
        </div>
        </div>
        
        {/* Material Control Tile - only show when style text was used in current extraction and matches */}
        {fingerprint && fingerprint.materialStyle && 
         fingerprint.materialStyle.toLowerCase() !== "flat" &&
         styleTextUsed.length > 0 && 
         doesMaterialStyleMatchStyleText(fingerprint.materialStyle, styleTextUsed) && (
          <MaterialControlTile 
            materialStyle={fingerprint.materialStyle} 
            intensity={fingerprint.materialIntensity ?? 0.7}
            palette={fingerprint.palette}
          />
        )}
      </div>
      
      {/* Primary button preview - separate from card */}
      {fingerprint && (
        <div className="mt-6" style={{ textAlign: "center" }}>
          <div
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 500,
              backgroundColor: primary,
              color: getContrastColor(primary),
              borderRadius: fingerprint.radius === "sharp" ? "0" :
                           fingerprint.radius === "subtle" ? "6px" :
                           fingerprint.radius === "rounded" ? "12px" :
                           fingerprint.radius === "pill" ? "9999px" : "8px",
              fontFamily: fingerprint.typography.fontFamily 
                ? `"${fingerprint.typography.fontFamily}", ${fingerprint.typography.category === "serif" ? "serif" : fingerprint.typography.category === "mono" ? "monospace" : "sans-serif"}`
                : undefined,
              border: "none",
              whiteSpace: "nowrap",
              display: "inline-block"
            }}
          >
            Primary action
          </div>
        </div>
      )}
    </div>
  );
}
