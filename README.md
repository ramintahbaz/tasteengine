# TasteEngine

Drop screenshots or moodboard images. Get back a structured design fingerprint — colors, typography, spacing, radius, material style — applied live to a sample UI.

Built with Next.js and GPT-4o vision.

[demo video or screenshot]

## what it does

- accepts one or more images (UI screenshots, product photos, moodboards, anything)
- sends them to GPT-4o with a structured extraction prompt
- returns a `TasteFingerprint` object: palette, typography, iconography, spacing, radius, and material properties
- renders a live card and button preview using the extracted fingerprint
- optional style text modifier (e.g. "glass-like", "matte", "soft shadows") to influence material extraction

## taste fingerprint shape

```ts
type TasteFingerprint = {
  palette: {
    primary: string[]
    accent: string[]
    neutral: string[]
    contrast: "low" | "medium" | "high"
  }
  typography: {
    category: "serif" | "sans-serif" | "mono" | "mixed"
    weight: "light" | "regular" | "medium" | "bold"
    scale: "small" | "medium" | "large"
    lineHeight: "tight" | "normal" | "airy"
    fontFamily?: string
    fontUrl?: string
  }
  iconography: {
    style: "minimal" | "rounded" | "sharp" | "filled" | "outlined" | "hand-drawn" | "geometric"
    weight: "thin" | "regular" | "bold"
    library: "feather" | "material" | "fa" | "heroicons"
  }
  radius: "sharp" | "subtle" | "rounded" | "pill"
  spacing: "tight" | "medium" | "airy"
  material: {
    translucency: number  // 0–1
    blur: number
    gloss: number
    texture: number
    softness: number
    elevation: number
    contrast: number
    edgeHighlight: number
  }
  materialStyle: "flat" | "glass" | "neuo" | "skeuo" | "solid" | string
  materialIntensity: number  // 0–1
}
```

## running locally

```bash
git clone https://github.com/ramintahbaz/tasteengine
cd tasteengine
npm install
cp .env.example .env.local
# add your OpenAI API key to .env.local
npm run dev
```

## env vars

```
OPENAI_API_KEY=your_key_here
```

## stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- GPT-4o vision via OpenAI API
- react-icons

## license

MIT © 2025 Ramin Tahbaz
