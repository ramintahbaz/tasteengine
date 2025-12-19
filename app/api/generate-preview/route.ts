import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { TasteFingerprint } from "@/app/types/taste";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const { fingerprint, designContext } = await request.json() as { 
      fingerprint: TasteFingerprint;
      designContext?: string;
    };
    
    if (!fingerprint) {
      return NextResponse.json(
        { error: "Fingerprint is required" },
        { status: 400 }
      );
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `You are a UI component generator. Given this design fingerprint:
${JSON.stringify(fingerprint, null, 2)}

${designContext ? `DESIGN STYLE CONTEXT: The user wants to apply "${designContext}" styling to this component. Apply this design style to:
- Radius: Adjust border radius styling to match the style (e.g., Skeuomorphism = more rounded with depth, Glassmorphism = subtle rounding)
- Typography: Adjust font weight, letter spacing, text shadows, or text effects to match the style
- Iconography: Adjust icon styling (shadows, depth, 3D effects, gradients) to match the style
- Visual effects: Add appropriate shadows, gradients, textures, depth, or other effects based on the style

Examples:
- Skeuomorphism: Add realistic shadows, depth, 3D effects, gradients, embossed/debossed textures, inner shadows
- Glassmorphism: Add backdrop blur, transparency, glass-like effects, subtle borders, light reflections
- Neumorphism: Add soft shadows (both inset and outset), subtle embossed effects, soft gradients
- 3D: Add depth, shadows, perspective, dimensional effects, gradients
- Flat: Remove shadows, keep it minimal and flat

` : ''}

Generate a React component that demonstrates this design system. The component should:
1. Use the exact colors from the palette (primary, accent, neutral)
2. Use the typography settings (font family, weight, scale, line height)${designContext ? `, but adjust typography styling (text shadows, letter spacing, weight variations) to match ${designContext}` : ''}
3. Apply the radius and spacing values${designContext ? `, but adjust radius styling and add ${designContext} effects (shadows, depth, gradients)` : ''}
4. Show a card with:
   - A headline title (22px, bold) using the typography${designContext ? ` with ${designContext} text effects` : ''}
   - Body text (14px) using the typography${designContext ? ` with ${designContext} text effects` : ''}
   - A circular icon (checkmark) using the iconography style${designContext ? ` with ${designContext} effects (shadows, depth, gradients)` : ''}
   - A primary action button using the primary color${designContext ? ` with ${designContext} effects` : ''}
5. The card should be 346px wide with 24px padding
6. The button should be separate from the card with spacing between them
7. Use inline styles for all styling
8. The component should be a functional React component
${designContext ? `9. IMPORTANT: Apply ${designContext} styling effects to:
   - Card: Add shadows, depth, gradients, textures based on the style
   - Radius: Adjust border radius styling with ${designContext} effects
   - Typography: Add text shadows, letter spacing, or other text effects matching ${designContext}
   - Iconography: Add shadows, depth, 3D effects, gradients to the icon matching ${designContext}
   - Button: Add ${designContext} effects (shadows, depth, gradients)
` : ''}

Return ONLY valid React/JSX code, no markdown fences, no explanations, no backticks. Just the component code.`;

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    const componentCode = message.content[0].type === "text" 
      ? message.content[0].text.trim()
      : "";

    // Clean up any markdown fences if present
    const cleanedCode = componentCode
      .replace(/^```(jsx|tsx|javascript|typescript)?\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return NextResponse.json({ componentCode: cleanedCode });
  } catch (error: unknown) {
    console.error("Claude API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

