import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(request: NextRequest) {
  // Check if API key is configured
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { context } = body as { context: string };

    if (!context || context.trim() === "") {
      return NextResponse.json(
        { error: "No context provided" },
        { status: 400 }
      );
    }

    const systemPrompt = `Act as a professional game localizer and editor. Your task is to translate a Russian game description context into natural, native-sounding English for a game store page.

### INPUT FORMAT
The input contains:
1. An optional general prose description in Russian.
2. Deep-content blocks with literal English labels like "Key Features:", "Game Modes:", "Tips & Tricks:", "Upgrades / Progression / Economy:", "Levels / Maps / Worlds:", "Vehicles / Cars:", "Characters / Heroes / Skins:", "Weapons / Gear / Items:", "Enemies / Bosses:", "Power-ups / Abilities:", "Story / Setting:".
3. FAQ questionnaire groups with literal English labels: "Core Gameplay & Story", "Mechanics & Progression", "Economy & Customization", "Retention & Engagement".
4. Inside FAQ groups: pairs marked exactly as "Q:" and "A:".

### RULES
1. TRANSLATE Russian text into fluent English. Keep it concise and suitable for a game store page.
2. PRESERVE ALL literal English labels exactly as written. Do not translate or modify labels like "Key Features:", "Core Gameplay & Story", "Q:", "A:", etc.
3. PRESERVE STRUCTURE: keep block order, list markers (• or -), line breaks, and FAQ groups.
4. FILTER OUT mentions of advertising, monetization, in-app purchases, interstitial/rewarded ads, Smart Ads, Anzu, or any platform/store restrictions. Remove those sentences entirely.
5. SKIP empty or placeholder answers (like "-", "неприменимо", "нет информации", "нет"). If a whole block has no valid content, remove it.
6. DO NOT invent facts. Translate only what is provided.
7. For game-specific names (modes, characters, items, vehicles, weapons, bosses, power-ups, levels/worlds), keep the original spelling as provided by the editor, usually in Latin script. Only translate the surrounding descriptive text.
8. Output plain text only, no markdown code blocks, no explanations.`;

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        { error: "OpenAI API error", details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const description = data.choices[0].message.content;
      return NextResponse.json({ description });
    }

    return NextResponse.json(
      { error: "Unexpected response format from OpenAI API" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error generating SEO description:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
