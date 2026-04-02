import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import {
    TasteFingerprint,
    RawTasteAnalysis,
    ModelTasteOutput,
  } from "@/app/types/taste";


export const runtime = "nodejs";



export async function POST(request: NextRequest) {

  try {

    if (!process.env.OPENAI_API_KEY) {

      return NextResponse.json(

        { error: "OPENAI_API_KEY is not configured" },

        { status: 500 }

      );

    }



    const client = new OpenAI({

      apiKey: process.env.OPENAI_API_KEY,

    });



    const formData = await request.formData();

    const images = formData.getAll("images") as File[];
    const styleText = formData.get("styleText") as string | null;


    if (!images || images.length === 0) {

      return NextResponse.json(

        { error: "No images provided" },

        { status: 400 }

      );

    }



    const imageBuffers = await Promise.all(

      images.map(async (file) => {

        const arrayBuffer = await file.arrayBuffer();

        const base64 = Buffer.from(arrayBuffer).toString("base64");

        // Detect MIME type from file, default to jpeg if unknown

        const mimeType = file.type || "image/jpeg";

        return { base64, mimeType };

      })

    );



    const prompt = buildTastePrompt(styleText);



    const response = await client.chat.completions.create({

      model: "gpt-4o",

      messages: [

        {

          role: "system",

          content:

            "You are a design taste engine. You analyze UI screenshots and moodboard images and output a single JSON object that describes the core design primitives. You respond ONLY with valid JSON. Do not include markdown code fences or any other formatting - return raw JSON only.",

        },

        {

          role: "user",

          content: [

            {

              type: "text",

              text: prompt,

            },

            ...imageBuffers.map(({ base64, mimeType }) => ({

              type: "image_url" as const,

              image_url: {

                url: `data:${mimeType};base64,${base64}`,

              },

            })),

          ],

        },

      ],

      temperature: 0.2,

      response_format: { type: "json_object" },

    });



    const raw = response.choices[0]?.message?.content;

    if (!raw) {

      throw new Error("No response from model");

    }



    const jsonString = extractJson(raw);

    let modelOutput: ModelTasteOutput;

    try {

      modelOutput = JSON.parse(jsonString) as ModelTasteOutput;

    } catch (parseError) {

      throw new Error(`Failed to parse response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);

    }



    const fingerprint = mapToTasteFingerprint(modelOutput.rawAnalysis);



    return NextResponse.json({

      fingerprint,

      confidence: modelOutput.confidence,

      clarifyingQuestions: modelOutput.clarifyingQuestions,

    });

  } catch (error: unknown) {

    console.error(error);

    const errorMessage = error instanceof Error ? error.message : "Unexpected error";

    return NextResponse.json(

      { error: errorMessage },

      { status: 500 }

    );

  }

}

function extractJson(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// Helper to get font from category (fallback when font family not identified)
function getFontFromCategory(category: "serif" | "sans-serif" | "mono" | "mixed"): { fontFamily: string; fontUrl: string } {
  if (category === "mono") {
    return {
      fontFamily: "JetBrains Mono",
      fontUrl: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap"
    };
  }
  
  if (category === "serif") {
    return {
      fontFamily: "Crimson Text",
      fontUrl: "https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600&display=swap"
    };
  }
  
  // Default sans-serif
  return { 
    fontFamily: "Inter", 
    fontUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" 
  };
}

// Helper to get typography from color-based mood
function getTypographyFromColorMood(
  colorMood: string[] | null | undefined,
  dominantColor?: string
): { fontFamily: string; fontUrl: string; category: "serif" | "sans-serif" | "mono"; weight: "light" | "regular" | "medium" | "bold"; moodCategory: string } {
  if (!colorMood || colorMood.length === 0) {
    // Default fallback
    const defaults = [
      { fontFamily: "Inter", category: "sans-serif" as const, weight: "regular" as const },
      { fontFamily: "Roboto", category: "sans-serif" as const, weight: "regular" as const },
      { fontFamily: "Open Sans", category: "sans-serif" as const, weight: "regular" as const },
    ];
    const selected = defaults[Math.floor(Math.random() * defaults.length)];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "neutral"
    };
  }

  const moodLower = colorMood.map(m => m.toLowerCase());
  
  // Use dominant color to add variety - hash the color to get consistent but varied selection
  const colorHash = dominantColor ? 
    dominantColor.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;

  // Earthy, natural, organic, warm, rustic → serif fonts
  if (moodLower.some(m => m.includes("earthy") || m.includes("natural") || m.includes("organic") || m.includes("warm") || m.includes("rustic") || m.includes("wood") || m.includes("terracotta"))) {
    const earthyFonts = [
      { fontFamily: "Crimson Text", category: "serif" as const, weight: "regular" as const },
      { fontFamily: "Lora", category: "serif" as const, weight: "regular" as const },
      { fontFamily: "Merriweather", category: "serif" as const, weight: "regular" as const },
    ];
    const selected = earthyFonts[colorHash % earthyFonts.length];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "earthy"
    };
  }

  // Futuristic, tech, digital, sleek, cyber → mono fonts
  if (moodLower.some(m => m.includes("futuristic") || m.includes("tech") || m.includes("digital") || m.includes("sleek") || m.includes("cyber") || m.includes("neon") || m.includes("sci-fi"))) {
    const techFonts = [
      { fontFamily: "JetBrains Mono", category: "mono" as const, weight: "medium" as const },
      { fontFamily: "Fira Code", category: "mono" as const, weight: "medium" as const },
      { fontFamily: "Source Code Pro", category: "mono" as const, weight: "medium" as const },
    ];
    const selected = techFonts[colorHash % techFonts.length];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "futuristic"
    };
  }

  // Luxury, elegant, sophisticated, premium, refined → elegant serif
  if (moodLower.some(m => m.includes("luxury") || m.includes("elegant") || m.includes("sophisticated") || m.includes("premium") || m.includes("refined") || m.includes("upscale"))) {
    const luxuryFonts = [
      { fontFamily: "Playfair Display", category: "serif" as const, weight: "regular" as const },
      { fontFamily: "Cormorant Garamond", category: "serif" as const, weight: "regular" as const },
      { fontFamily: "Libre Baskerville", category: "serif" as const, weight: "regular" as const },
    ];
    const selected = luxuryFonts[colorHash % luxuryFonts.length];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "luxury"
    };
  }

  // Playful, vibrant, energetic, fun, cheerful → rounded sans-serif
  if (moodLower.some(m => m.includes("playful") || m.includes("vibrant") || m.includes("energetic") || m.includes("fun") || m.includes("cheerful") || m.includes("colorful") || m.includes("bright"))) {
    const playfulFonts = [
      { fontFamily: "Comfortaa", category: "sans-serif" as const, weight: "bold" as const },
      { fontFamily: "Nunito", category: "sans-serif" as const, weight: "bold" as const },
      { fontFamily: "Quicksand", category: "sans-serif" as const, weight: "bold" as const },
    ];
    const selected = playfulFonts[colorHash % playfulFonts.length];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "playful"
    };
  }

  // Brutalist, geometric, strong, bold, industrial → geometric sans-serif
  if (moodLower.some(m => m.includes("brutalist") || m.includes("geometric") || m.includes("industrial") || m.includes("architectural") || m.includes("structural"))) {
    const brutalistFonts = [
      { fontFamily: "Space Grotesk", category: "sans-serif" as const, weight: "medium" as const },
      { fontFamily: "Barlow", category: "sans-serif" as const, weight: "medium" as const },
      { fontFamily: "Work Sans", category: "sans-serif" as const, weight: "medium" as const },
    ];
    const selected = brutalistFonts[colorHash % brutalistFonts.length];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "brutalist"
    };
  }

  // Minimal, clean, calm, simple, neutral → clean sans-serif (but more specific, avoid "modern")
  if (moodLower.some(m => (m.includes("minimal") || m.includes("clean") || m.includes("calm") || m.includes("simple") || m.includes("neutral")) && !m.includes("modern"))) {
    const minimalFonts = [
      { fontFamily: "Inter", category: "sans-serif" as const, weight: "regular" as const },
      { fontFamily: "Roboto", category: "sans-serif" as const, weight: "regular" as const },
      { fontFamily: "Open Sans", category: "sans-serif" as const, weight: "regular" as const },
    ];
    const selected = minimalFonts[colorHash % minimalFonts.length];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "minimal"
    };
  }

  // Modern, contemporary, fresh → modern sans-serif (separate from minimal)
  if (moodLower.some(m => m.includes("modern") || m.includes("contemporary") || m.includes("fresh") || m.includes("current") || m.includes("trendy"))) {
    const modernFonts = [
      { fontFamily: "Poppins", category: "sans-serif" as const, weight: "regular" as const },
      { fontFamily: "Montserrat", category: "sans-serif" as const, weight: "regular" as const },
      { fontFamily: "Raleway", category: "sans-serif" as const, weight: "regular" as const },
    ];
    const selected = modernFonts[colorHash % modernFonts.length];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "modern"
    };
  }

  // Vintage, retro, nostalgic, classic → vintage serif
  if (moodLower.some(m => m.includes("vintage") || m.includes("retro") || m.includes("nostalgic") || m.includes("classic") || m.includes("antique") || m.includes("heritage"))) {
    const vintageFonts = [
      { fontFamily: "Bitter", category: "serif" as const, weight: "regular" as const },
      { fontFamily: "Lora", category: "serif" as const, weight: "regular" as const },
      { fontFamily: "Crimson Text", category: "serif" as const, weight: "regular" as const },
    ];
    const selected = vintageFonts[colorHash % vintageFonts.length];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "vintage"
    };
  }

  // Medical, clinical, professional, sterile → clean professional sans-serif
  if (moodLower.some(m => m.includes("medical") || m.includes("clinical") || m.includes("professional") || m.includes("sterile") || m.includes("healthcare"))) {
    const medicalFonts = [
      { fontFamily: "Roboto", category: "sans-serif" as const, weight: "regular" as const },
      { fontFamily: "Lato", category: "sans-serif" as const, weight: "regular" as const },
      { fontFamily: "Source Sans Pro", category: "sans-serif" as const, weight: "regular" as const },
    ];
    const selected = medicalFonts[colorHash % medicalFonts.length];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "professional"
    };
  }

  // Artistic, creative, expressive, hand-drawn → creative fonts
  if (moodLower.some(m => m.includes("artistic") || m.includes("creative") || m.includes("expressive") || m.includes("hand-drawn") || m.includes("illustrative"))) {
    const artisticFonts = [
      { fontFamily: "Caveat", category: "sans-serif" as const, weight: "regular" as const },
      { fontFamily: "Dancing Script", category: "sans-serif" as const, weight: "regular" as const },
      { fontFamily: "Kalam", category: "sans-serif" as const, weight: "regular" as const },
    ];
    const selected = artisticFonts[colorHash % artisticFonts.length];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "artistic"
    };
  }

  // Corporate, business, formal, serious → formal sans-serif
  if (moodLower.some(m => m.includes("corporate") || m.includes("business") || m.includes("formal") || m.includes("serious"))) {
    const corporateFonts = [
      { fontFamily: "Roboto", category: "sans-serif" as const, weight: "regular" as const },
      { fontFamily: "Lato", category: "sans-serif" as const, weight: "regular" as const },
      { fontFamily: "Open Sans", category: "sans-serif" as const, weight: "regular" as const },
    ];
    const selected = corporateFonts[colorHash % corporateFonts.length];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "corporate"
    };
  }

  // Cozy, warm, inviting, homey → friendly serif
  if (moodLower.some(m => m.includes("cozy") || m.includes("inviting") || m.includes("homey") || m.includes("comfortable") || m.includes("welcoming"))) {
    const cozyFonts = [
      { fontFamily: "Lora", category: "serif" as const, weight: "regular" as const },
      { fontFamily: "Merriweather", category: "serif" as const, weight: "regular" as const },
      { fontFamily: "Crimson Text", category: "serif" as const, weight: "regular" as const },
    ];
    const selected = cozyFonts[colorHash % cozyFonts.length];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "cozy"
    };
  }

  // Dark, mysterious, gothic, edgy → bold sans-serif
  if (moodLower.some(m => m.includes("dark") || m.includes("mysterious") || m.includes("gothic") || m.includes("edgy") || m.includes("noir"))) {
    const darkFonts = [
      { fontFamily: "Oswald", category: "sans-serif" as const, weight: "bold" as const },
      { fontFamily: "Bebas Neue", category: "sans-serif" as const, weight: "regular" as const },
      { fontFamily: "Raleway", category: "sans-serif" as const, weight: "bold" as const },
    ];
    const selected = darkFonts[colorHash % darkFonts.length];
    return {
      ...selected,
      fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
      moodCategory: "dark"
    };
  }

  // Default fallback - use variety
  const defaults = [
    { fontFamily: "Inter", category: "sans-serif" as const, weight: "regular" as const },
    { fontFamily: "Roboto", category: "sans-serif" as const, weight: "regular" as const },
    { fontFamily: "Open Sans", category: "sans-serif" as const, weight: "regular" as const },
    { fontFamily: "Lato", category: "sans-serif" as const, weight: "regular" as const },
  ];
  const selected = defaults[colorHash % defaults.length];
  return {
    ...selected,
    fontUrl: getGoogleFontUrl(selected.fontFamily, selected.weight),
    moodCategory: "neutral"
  };
}

// Helper to get Google Font URL for a font family
function getGoogleFontUrl(fontFamily: string, weight: string = "regular"): string {
  const weightMap: Record<string, string[]> = {
    "light": ["300"],
    "regular": ["400"],
    "medium": ["500"],
    "bold": ["700"]
  };
  
  const weights = weightMap[weight] || ["400"];
  const familyName = fontFamily.replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${familyName}:wght@${weights.join(';')}&display=swap`;
}

// Helper to match font name to Google Fonts
function matchFontToGoogleFonts(fontFamily: string | null | undefined): { fontFamily: string; fontUrl: string } | null {
  if (!fontFamily) return null;
  
  const fontName = fontFamily.toLowerCase().trim();
  const googleFonts: Record<string, string> = {
    "inter": "Inter",
    "roboto": "Roboto",
    "helvetica": "Helvetica",
    "arial": "Arial",
    "georgia": "Georgia",
    "times": "Times New Roman",
    "jetbrains mono": "JetBrains Mono",
    "fira code": "Fira Code",
    "source code pro": "Source Code Pro",
    "playfair display": "Playfair Display",
    "crimson text": "Crimson Text",
    "lora": "Lora",
    "merriweather": "Merriweather",
    "open sans": "Open Sans",
    "lato": "Lato",
    "montserrat": "Montserrat",
    "raleway": "Raleway",
    "poppins": "Poppins",
    "nunito": "Nunito",
    "comfortaa": "Comfortaa",
    "space grotesk": "Space Grotesk",
    "cormorant garamond": "Cormorant Garamond",
    "libre baskerville": "Libre Baskerville",
    "quicksand": "Quicksand",
    "barlow": "Barlow",
    "work sans": "Work Sans",
    "bitter": "Bitter",
    "source sans pro": "Source Sans Pro",
    "caveat": "Caveat",
    "dancing script": "Dancing Script",
    "kalam": "Kalam",
    "oswald": "Oswald",
    "bebas neue": "Bebas Neue"
  };
  
  // Try exact match
  if (googleFonts[fontName]) {
    return {
      fontFamily: googleFonts[fontName],
      fontUrl: getGoogleFontUrl(googleFonts[fontName])
    };
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(googleFonts)) {
    if (fontName.includes(key) || key.includes(fontName)) {
      return {
        fontFamily: value,
        fontUrl: getGoogleFontUrl(value)
      };
    }
  }
  
  return null;
}

// Helper to get iconography from color-based mood
function getIconographyFromColorMood(
  colorMood: string[] | null | undefined,
  dominantColor?: string
): { style: "minimal" | "rounded" | "sharp" | "filled" | "outlined" | "hand-drawn" | "geometric"; weight: "thin" | "regular" | "bold"; library: "feather" | "material" | "material-outlined" | "fa" | "material-sharp" | "heroicons"; moodCategory: string } {
  if (!colorMood || colorMood.length === 0) {
    return {
      style: "outlined",
      weight: "regular",
      library: "heroicons",
      moodCategory: "neutral"
    };
  }

  const moodLower = colorMood.map(m => m.toLowerCase());
  const colorHash = dominantColor ? 
    dominantColor.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;

  // Earthy, natural, organic → hand-drawn or rounded (Feather or Heroicons)
  if (moodLower.some(m => m.includes("earthy") || m.includes("natural") || m.includes("organic") || m.includes("warm") || m.includes("rustic"))) {
    const options = [
      { style: "hand-drawn" as const, weight: "regular" as const, library: "feather" as const },
      { style: "rounded" as const, weight: "regular" as const, library: "heroicons" as const },
      { style: "outlined" as const, weight: "thin" as const, library: "feather" as const },
    ];
    const selected = options[colorHash % options.length];
    return { ...selected, moodCategory: "earthy" };
  }

  // Futuristic, tech, digital → sharp, geometric (Material Design)
  if (moodLower.some(m => m.includes("futuristic") || m.includes("tech") || m.includes("digital") || m.includes("sleek") || m.includes("cyber"))) {
    const options = [
      { style: "geometric" as const, weight: "regular" as const, library: "material" as const },
      { style: "sharp" as const, weight: "regular" as const, library: "material-sharp" as const },
      { style: "filled" as const, weight: "bold" as const, library: "material" as const },
    ];
    const selected = options[colorHash % options.length];
    return { ...selected, moodCategory: "futuristic" };
  }

  // Luxury, elegant, sophisticated → minimal, outlined (Material Outlined)
  if (moodLower.some(m => m.includes("luxury") || m.includes("elegant") || m.includes("sophisticated") || m.includes("premium") || m.includes("refined"))) {
    const options = [
      { style: "minimal" as const, weight: "thin" as const, library: "material-outlined" as const },
      { style: "outlined" as const, weight: "thin" as const, library: "material-outlined" as const },
      { style: "rounded" as const, weight: "regular" as const, library: "material-outlined" as const },
    ];
    const selected = options[colorHash % options.length];
    return { ...selected, moodCategory: "luxury" };
  }

  // Playful, vibrant, energetic → rounded, filled (Font Awesome)
  if (moodLower.some(m => m.includes("playful") || m.includes("vibrant") || m.includes("energetic") || m.includes("fun") || m.includes("cheerful") || m.includes("colorful"))) {
    const options = [
      { style: "rounded" as const, weight: "bold" as const, library: "fa" as const },
      { style: "filled" as const, weight: "bold" as const, library: "fa" as const },
      { style: "hand-drawn" as const, weight: "regular" as const, library: "fa" as const },
    ];
    const selected = options[colorHash % options.length];
    return { ...selected, moodCategory: "playful" };
  }

  // Brutalist, geometric, industrial → sharp, geometric (Material Sharp)
  if (moodLower.some(m => m.includes("brutalist") || m.includes("geometric") || m.includes("industrial") || m.includes("architectural"))) {
    const options = [
      { style: "sharp" as const, weight: "bold" as const, library: "material-sharp" as const },
      { style: "geometric" as const, weight: "bold" as const, library: "material-sharp" as const },
      { style: "filled" as const, weight: "bold" as const, library: "material-sharp" as const },
    ];
    const selected = options[colorHash % options.length];
    return { ...selected, moodCategory: "brutalist" };
  }

  // Minimal, clean, calm → minimal, outlined (Feather)
  if (moodLower.some(m => (m.includes("minimal") || m.includes("clean") || m.includes("calm") || m.includes("simple") || m.includes("neutral")) && !m.includes("modern"))) {
    const options = [
      { style: "minimal" as const, weight: "thin" as const, library: "feather" as const },
      { style: "outlined" as const, weight: "thin" as const, library: "feather" as const },
      { style: "rounded" as const, weight: "regular" as const, library: "feather" as const },
    ];
    const selected = options[colorHash % options.length];
    return { ...selected, moodCategory: "minimal" };
  }

  // Modern, contemporary, fresh → rounded, outlined (Heroicons)
  if (moodLower.some(m => m.includes("modern") || m.includes("contemporary") || m.includes("fresh") || m.includes("current") || m.includes("trendy"))) {
    const options = [
      { style: "rounded" as const, weight: "regular" as const, library: "heroicons" as const },
      { style: "outlined" as const, weight: "regular" as const, library: "heroicons" as const },
      { style: "minimal" as const, weight: "regular" as const, library: "heroicons" as const },
    ];
    const selected = options[colorHash % options.length];
    return { ...selected, moodCategory: "modern" };
  }

  // Vintage, retro, nostalgic → hand-drawn, outlined (Font Awesome)
  if (moodLower.some(m => m.includes("vintage") || m.includes("retro") || m.includes("nostalgic") || m.includes("classic") || m.includes("antique"))) {
    const options = [
      { style: "hand-drawn" as const, weight: "regular" as const, library: "fa" as const },
      { style: "outlined" as const, weight: "regular" as const, library: "fa" as const },
      { style: "filled" as const, weight: "regular" as const, library: "fa" as const },
    ];
    const selected = options[colorHash % options.length];
    return { ...selected, moodCategory: "vintage" };
  }

  // Professional, medical, clinical → minimal, outlined (Material Design)
  if (moodLower.some(m => m.includes("professional") || m.includes("medical") || m.includes("clinical") || m.includes("sterile") || m.includes("healthcare"))) {
    const options = [
      { style: "minimal" as const, weight: "regular" as const, library: "material" as const },
      { style: "outlined" as const, weight: "regular" as const, library: "material-outlined" as const },
      { style: "rounded" as const, weight: "regular" as const, library: "material" as const },
    ];
    const selected = options[colorHash % options.length];
    return { ...selected, moodCategory: "professional" };
  }

  // Artistic, creative, expressive → hand-drawn, filled (Font Awesome)
  if (moodLower.some(m => m.includes("artistic") || m.includes("creative") || m.includes("expressive") || m.includes("hand-drawn") || m.includes("illustrative"))) {
    const options = [
      { style: "hand-drawn" as const, weight: "regular" as const, library: "fa" as const },
      { style: "filled" as const, weight: "bold" as const, library: "fa" as const },
      { style: "rounded" as const, weight: "regular" as const, library: "fa" as const },
    ];
    const selected = options[colorHash % options.length];
    return { ...selected, moodCategory: "artistic" };
  }

  // Corporate, business, formal → minimal, outlined (Material Design)
  if (moodLower.some(m => m.includes("corporate") || m.includes("business") || m.includes("formal") || m.includes("serious"))) {
    const options = [
      { style: "minimal" as const, weight: "regular" as const, library: "material" as const },
      { style: "outlined" as const, weight: "regular" as const, library: "material-outlined" as const },
      { style: "geometric" as const, weight: "regular" as const, library: "material" as const },
    ];
    const selected = options[colorHash % options.length];
    return { ...selected, moodCategory: "corporate" };
  }

  // Cozy, warm, inviting → rounded, outlined (Heroicons)
  if (moodLower.some(m => m.includes("cozy") || m.includes("inviting") || m.includes("homey") || m.includes("comfortable") || m.includes("welcoming"))) {
    const options = [
      { style: "rounded" as const, weight: "regular" as const, library: "heroicons" as const },
      { style: "outlined" as const, weight: "regular" as const, library: "heroicons" as const },
      { style: "hand-drawn" as const, weight: "regular" as const, library: "heroicons" as const },
    ];
    const selected = options[colorHash % options.length];
    return { ...selected, moodCategory: "cozy" };
  }

  // Dark, mysterious, gothic → sharp, filled (Material Sharp)
  if (moodLower.some(m => m.includes("dark") || m.includes("mysterious") || m.includes("gothic") || m.includes("edgy") || m.includes("noir"))) {
    const options = [
      { style: "sharp" as const, weight: "bold" as const, library: "material-sharp" as const },
      { style: "filled" as const, weight: "bold" as const, library: "material-sharp" as const },
      { style: "geometric" as const, weight: "bold" as const, library: "material-sharp" as const },
    ];
    const selected = options[colorHash % options.length];
    return { ...selected, moodCategory: "dark" };
  }

  // Default fallback
  return {
    style: "outlined",
    weight: "regular",
    library: "heroicons",
    moodCategory: "neutral"
  };
}

function mapToTasteFingerprint(raw: RawTasteAnalysis): TasteFingerprint {
  // COLORS: Use direct values from model (simple & smart)
  let primary: string[];
  if (raw.contentType === "ui" && raw.uiDetails?.primaryButtonColor) {
    // If it's a UI, use the exact primary button color
    primary = [raw.uiDetails.primaryButtonColor];
  } else if (raw.dominantColor) {
    // Otherwise use the dominant color
    primary = [raw.dominantColor];
  } else {
    // Fallback
    primary = raw.lightDarkBias === "dark" ? ["#000000"] : ["#FFFFFF"];
  }
  
  // Reject blue fallback
  if (primary[0] === "#2563EB") {
    primary = raw.lightDarkBias === "dark" ? ["#000000"] : ["#FFFFFF"];
  }
  
  let accent: string[];
  if (raw.secondaryColor) {
    accent = [raw.secondaryColor];
  } else {
    accent = [];
  }
  
  let neutral: string[];
  if (raw.contentType === "ui" && raw.uiDetails?.cardBackgroundColor) {
    neutral = [raw.uiDetails.cardBackgroundColor];
  } else if (raw.backgroundColor) {
    neutral = [raw.backgroundColor];
  } else {
    neutral = raw.lightDarkBias === "dark" ? ["#111827"] : ["#F5F5F5"];
  }
  
  // RADIUS: Use UI details if available, otherwise map from score
  let radius: TasteFingerprint["radius"];
  if (raw.contentType === "ui" && raw.uiDetails?.borderRadius !== null && raw.uiDetails?.borderRadius !== undefined) {
    const px = raw.uiDetails.borderRadius;
    if (px === 0) radius = "sharp";
    else if (px <= 6) radius = "subtle";
    else if (px <= 12) radius = "rounded";
    else radius = "pill";
  } else {
    // Map from edgeRoundnessScore
    if (raw.edgeRoundnessScore <= 0.2) radius = "sharp";
    else if (raw.edgeRoundnessScore <= 0.5) radius = "subtle";
    else if (raw.edgeRoundnessScore <= 0.8) radius = "rounded";
    else radius = "pill";
  }
  
  // SPACING: Map from visualDensity
  let spacing: TasteFingerprint["spacing"];
  if (raw.visualDensity === "dense") spacing = "tight";
  else if (raw.visualDensity === "sparse") spacing = "airy";
  else spacing = "medium";
  
  // TYPOGRAPHY: Use actual font details if available, otherwise infer from colors
  let fontFamily: string | undefined;
  let fontUrl: string | undefined;
  let category: TasteFingerprint["typography"]["category"] = "sans-serif";
  let weight: TasteFingerprint["typography"]["weight"] = "regular";
  let scale: TasteFingerprint["typography"]["scale"] = "medium";
  let lineHeight: TasteFingerprint["typography"]["lineHeight"] = "normal";
  let colorBasedTypography: { fontFamily: string; fontUrl: string; category: "serif" | "sans-serif" | "mono"; weight: "light" | "regular" | "medium" | "bold"; moodCategory: string } | undefined;
  
  if (raw.typographyDetails) {
    // USE EXISTING TYPOGRAPHY: If typography exists in the images, use it
    category = raw.typographyDetails.fontCategory;
    weight = raw.typographyDetails.fontWeight;
    scale = raw.typographyDetails.fontSize;
    
    // Try to match the font family to Google Fonts
    if (raw.typographyDetails.fontFamily) {
      const matched = matchFontToGoogleFonts(raw.typographyDetails.fontFamily);
      if (matched) {
        fontFamily = matched.fontFamily;
        fontUrl = matched.fontUrl;
      } else {
        // Fallback to category-based font
        const fontInfo = getFontFromCategory(category);
        fontFamily = fontInfo.fontFamily;
        fontUrl = fontInfo.fontUrl;
      }
    } else {
      // No font family identified, use category-based
      const fontInfo = getFontFromCategory(category);
      fontFamily = fontInfo.fontFamily;
      fontUrl = fontInfo.fontUrl;
    }
  } else {
    // NO TYPOGRAPHY EXISTS: Infer typography from color-based mood
    colorBasedTypography = getTypographyFromColorMood(
      raw.colorBasedMood,
      raw.dominantColor
    );
    
    fontFamily = colorBasedTypography.fontFamily;
    fontUrl = colorBasedTypography.fontUrl;
    category = colorBasedTypography.category;
    weight = colorBasedTypography.weight;
    
    // Set scale and lineHeight based on inferred mood
    const moodLower = (raw.colorBasedMood || []).map(m => m.toLowerCase());
    if (moodLower.some(m => m.includes("luxury") || m.includes("elegant"))) {
      scale = "large";
      lineHeight = "airy";
    } else if (moodLower.some(m => m.includes("playful") || m.includes("bold"))) {
      scale = "large";
      lineHeight = "normal";
    } else {
      scale = "medium";
      lineHeight = "normal";
    }
  }

  // Determine moodCategory for return value
  let moodCategory: string | undefined;
  if (raw.typographyDetails) {
    moodCategory = "extracted"; // Typography was extracted from images
  } else {
    moodCategory = colorBasedTypography?.moodCategory; // Typography was inferred from colors
  }

  // ICONOGRAPHY: Use actual iconography details if available, otherwise infer from colors
  let iconStyle: TasteFingerprint["iconography"]["style"] = "outlined";
  let iconWeight: TasteFingerprint["iconography"]["weight"] = "regular";
  let iconLibrary: TasteFingerprint["iconography"]["library"] = "heroicons";
  let iconMoodCategory: string | undefined;

  if (raw.iconographyDetails) {
    // USE EXISTING ICONOGRAPHY: If iconography exists in the images, use it
    iconStyle = raw.iconographyDetails.style;
    iconWeight = raw.iconographyDetails.weight;
    // Default to heroicons for extracted iconography, but could be enhanced to detect library
    iconLibrary = "heroicons";
    iconMoodCategory = "extracted";
  } else {
    // NO ICONOGRAPHY EXISTS: Infer iconography from color-based mood
    const colorBasedIconography = getIconographyFromColorMood(
      raw.colorBasedMood,
      raw.dominantColor
    );
    
    iconStyle = colorBasedIconography.style;
    iconWeight = colorBasedIconography.weight;
    iconLibrary = colorBasedIconography.library;
    iconMoodCategory = colorBasedIconography.moodCategory;
  }

  // MATERIAL: Map from raw material, with defaults and clamping
  const clamp = (value: number): number => Math.max(0, Math.min(1, value));
  
  const material: TasteFingerprint["material"] = raw.material ? {
    translucency: clamp(raw.material.translucency ?? 0),
    blur: clamp(raw.material.blur ?? 0),
    gloss: clamp(raw.material.gloss ?? 0),
    texture: clamp(raw.material.texture ?? 0),
    softness: clamp(raw.material.softness ?? 0.5),
    elevation: clamp(raw.material.elevation ?? 0),
    contrast: clamp(raw.material.contrast ?? 0.5),
    edgeHighlight: clamp(raw.material.edgeHighlight ?? 0),
  } : {
    // Default material spec if not provided
    translucency: 0,
    blur: 0,
    gloss: 0,
    texture: 0,
    softness: 0.5,
    elevation: 0,
    contrast: 0.5,
    edgeHighlight: 0,
  };

  // MATERIAL STYLE: Map from raw, with defaults
  // Ensure materialStyle is always a valid string
  const materialStyle = (raw.materialStyle && typeof raw.materialStyle === "string" && raw.materialStyle.trim()) 
    ? raw.materialStyle.trim() 
    : "flat";
  const materialIntensity = raw.materialIntensity !== undefined 
    ? clamp(raw.materialIntensity) 
    : 0.7;

  return {
    palette: {
      primary,
      accent,
      neutral,
      contrast: raw.lightDarkBias === "dark" ? "high" : 
               raw.lightDarkBias === "light" ? "low" : 
               "medium"
    },
    typography: {
      category,
      weight,
      scale,
      lineHeight,
      fontFamily,
      fontUrl,
      moodCategory
    },
    iconography: {
      style: iconStyle,
      weight: iconWeight,
      library: iconLibrary,
      moodCategory: iconMoodCategory
    },
    radius,
    spacing,
    material, // Always included
    materialStyle,
    materialIntensity
  };
}

function buildTastePrompt(styleText?: string | null): string {
  const styleModifier = styleText?.trim() 
    ? `\n\nSTYLE MODIFIER: The user has provided this style description: "${styleText.trim()}". Use this as a modifier to influence the material properties extraction. For example, if they say "glass-like", increase translucency and blur. If they say "matte", decrease gloss. If they say "soft shadows", increase softness and elevation. If they say "3D depth", increase elevation and contrast. Interpret their description and adjust the material spec accordingly.`
    : "";

  return `
You are a design taste extraction engine. Analyze the uploaded images with EXTREME attention to detail.

STEP 1: IDENTIFY CONTENT TYPE
First, determine what the user is trying to extract taste from:
- "ui": Screenshots of apps, websites, interfaces, dashboards
- "product": Photos of physical products (cars, keyboards, furniture, clothing, etc.)
- "photography": Artistic photos, lifestyle images, portraits
- "illustration": Drawings, graphics, artwork, posters
- "mixed": Combination of the above

STEP 2: COLOR EXTRACTION (Simple & Direct)
Look at the images and identify:
- dominantColor: The single most common/prominent color in the images (as hex code like "#FF5733"). This is the color that appears most frequently.
- textColor: If there is visible text in the images, what color is it? (as hex code). If no text, use null.
- secondaryColor: The second most common/prominent color (as hex code). If there's only one main color, use null.
- backgroundColor: What is the main background color? (as hex code)

STEP 3: TYPOGRAPHY EXTRACTION
FIRST, check if there is ANY visible typography/text in the images:
- If YES (contentType === "ui" or there is visible text):
  - Extract the ACTUAL typography details:
    - fontFamily: Try to identify the exact font name if possible (e.g., "Inter", "Roboto", "Georgia", "JetBrains Mono", "Helvetica", "Arial"). If you cannot identify it with confidence, use null.
    - fontCategory: "serif" (has decorative strokes), "sans-serif" (clean, no strokes), "mono" (fixed-width, code-like), or "mixed" (combination)
    - fontWeight: "light" (thin), "regular" (normal), "medium" (semi-bold), or "bold" (heavy)
    - fontSize: "small" (body text), "medium" (normal), or "large" (headlines)
  - Set typographyDetails with these values
  
- If NO (no visible text/typography in images):
  - Set typographyDetails to null
  - Analyze the extracted colors (dominantColor, secondaryColor, backgroundColor, colorFamilies) and infer what feeling/emotion they evoke
  - colorBasedMood: Provide 3-6 descriptive words that capture the aesthetic feeling based on the colors (e.g., ["earthy", "natural", "warm", "organic"] for browns/greens, ["futuristic", "tech", "modern", "sleek"] for blues/grays, ["luxury", "elegant", "sophisticated"] for deep purples/golds, ["playful", "vibrant", "energetic"] for bright colors, ["minimal", "clean", "calm"] for neutrals)
  - Think about: What emotion do these colors convey? What style do they suggest? What typography would complement this color palette?

STEP 3.5: ICONOGRAPHY EXTRACTION
FIRST, check if there are ANY visible icons/symbols in the images:
- If YES (contentType === "ui" or there are visible icons/symbols):
  - Extract the ACTUAL iconography details:
    - style: "minimal" (simple, clean lines), "rounded" (soft, friendly), "sharp" (angular, geometric), "filled" (solid shapes), "outlined" (thin outlines), "hand-drawn" (sketchy, organic), or "geometric" (precise shapes)
    - weight: "thin" (delicate lines), "regular" (normal thickness), or "bold" (thick, heavy)
  - Set iconographyDetails with these values
  
- If NO (no visible icons/symbols in images):
  - Set iconographyDetails to null
  - The system will infer iconography style from the color-based mood (same as typography)

STEP 4: UI-SPECIFIC DETAILS (Only if contentType === "ui")
If the images are UI screenshots, extract these EXACT values:
- primaryButtonColor: The background color of primary action buttons (hex code)
- primaryButtonTextColor: The text color on primary buttons (hex code)
- cardBackgroundColor: The background color of cards/containers (hex code)
- borderRadius: The border radius of buttons/cards in pixels (e.g., 0, 4, 8, 12, 16, 24). Measure carefully.

STEP 5: OTHER DETAILS
- overallMood: 3-6 descriptive words about the aesthetic (e.g., ["minimal", "modern", "elegant"])
- shapeSoftness: "soft" (curved, smooth), "mixed" (both), or "hard" (sharp, angular)
- edgeRoundnessScore: 0-1 (0 = very sharp/boxy, 1 = very rounded/pill-like)
- visualDensity: "sparse" (airy, lots of space), "medium", or "dense" (packed, tight)
- colorFamilies: Array of descriptive color names you see (e.g., ["deep green", "charcoal", "warm beige"])
- lightDarkBias: "light" (mostly light colors), "dark" (mostly dark), or "mixed"

STEP 6: MATERIAL PROPERTIES EXTRACTION
Analyze the visual material properties of the surfaces, textures, and effects in the images. Consider:
- translucency (0-1): How transparent/see-through are surfaces? 0 = opaque, 1 = fully transparent/glass-like
- blur (0-1): How much backdrop blur/frosted glass effect? 0 = no blur, 1 = heavy blur
- gloss (0-1): How shiny/reflective are surfaces? 0 = matte, 1 = mirror-like
- texture (0-1): How rough/grainy are surfaces? 0 = smooth, 1 = very textured
- softness (0-1): How soft are shadows and edges? 0 = hard/crisp, 1 = very soft/diffused
- elevation (0-1): How much depth/shadow elevation? 0 = flat, 1 = very raised/3D
- contrast (0-1): Light/dark contrast in shadows and highlights? 0 = low contrast, 1 = high contrast
- edgeHighlight (0-1): How much edge glow/border highlight? 0 = no highlight, 1 = strong edge glow

${styleModifier}

For each property, output a number between 0 and 1 based on what you observe in the images. If the user provided style text, use it to modify these values appropriately.

STEP 7: MATERIAL STYLE INFERENCE
Based on the material properties you extracted and the visual appearance of the images, infer the overall material style:
- "skeuo" (skeuomorphic): Realistic 3D depth, bevels, glossy highlights, strong shadows, inset elements, physical/tangible look
- "neuo" (neumorphic): Very soft twin shadows (light from top-left, dark from bottom-right), low contrast, extruded/embossed look, subtle depth
- "glass" (glassmorphic): Translucent backgrounds, backdrop blur, subtle border highlights, see-through effect
- "solid": Strong contrast, crisp edges, modern "hardware" depth, bold shadows, defined borders
- "flat": Minimal shadows, simple, low depth, clean edges, modern flat design
- Or any other descriptive string that captures the material aesthetic (e.g., "metallic", "fabric", "wood", etc.)

Also determine materialIntensity (0-1): How pronounced/strong is this material style? 
- 0 = very subtle, barely noticeable
- 1 = very strong, highly pronounced
- Default to 0.7 if unsure

${styleModifier}

The material style should be inferred from the visual characteristics, NOT just from keywords. Look at the actual shadows, depth, translucency, and surface qualities in the images.

Respond with JSON in this exact shape:
{
  "rawAnalysis": {
    "contentType": "ui" | "product" | "photography" | "illustration" | "mixed",
    "typographyDetails": {
      "fontFamily": string | null,
      "fontCategory": "serif" | "sans-serif" | "mono" | "mixed",
      "fontWeight": "light" | "regular" | "medium" | "bold",
      "fontSize": "small" | "medium" | "large"
    } | null,
    "iconographyDetails": {
      "style": "minimal" | "rounded" | "sharp" | "filled" | "outlined" | "hand-drawn" | "geometric",
      "weight": "thin" | "regular" | "bold"
    } | null,
    "colorBasedMood": string[] | null,
    "dominantColor": string,
    "textColor": string | null,
    "secondaryColor": string | null,
    "backgroundColor": string,
    "uiDetails": {
      "primaryButtonColor": string | null,
      "primaryButtonTextColor": string | null,
      "cardBackgroundColor": string | null,
      "borderRadius": number | null
    },
    "overallMood": string[],
    "shapeSoftness": "soft" | "mixed" | "hard",
    "edgeRoundnessScore": number,
    "visualDensity": "sparse" | "medium" | "dense",
    "colorFamilies": string[],
    "lightDarkBias": "light" | "dark" | "mixed",
    "material": {
      "translucency": number,
      "blur": number,
      "gloss": number,
      "texture": number,
      "softness": number,
      "elevation": number,
      "contrast": number,
      "edgeHighlight": number
    },
    "materialStyle": "flat" | "glass" | "neuo" | "skeuo" | "solid" | string,
    "materialIntensity": number
  },
  "confidence": {
    "palette": number,
    "typography": number,
    "radius": number,
    "spacing": number,
    "material": number
  },
  "clarifyingQuestions": []
}

IMPORTANT:
- Be extremely precise with color hex codes. Look carefully at the actual colors.
- If it's a UI, copy the exact colors and values you see.
- If it's a product/photography, identify the dominant colors accurately.
- If there's no typography, use colorBasedMood to infer the aesthetic feeling from colors.
- ALWAYS include the material object with all 8 properties (translucency, blur, gloss, texture, softness, elevation, contrast, edgeHighlight) as numbers between 0 and 1.
- ALWAYS include materialStyle (even if you're unsure, use "flat" as default) and materialIntensity (default to 0.7 if unsure).
- Respond with JSON only, no markdown fences, no explanations.
    `.trim();
}

