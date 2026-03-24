import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Post-process translated text to fix any incorrectly translated technical terms
function fixTechnicalTerms(text: string, targetLanguage: "en" | "ru"): string {
  if (targetLanguage !== "ru") return text;
  
  // Map of incorrect Russian translations back to English terms
  const fixes: Record<string, string> = {
    // Interstitial variants
    "Интерстициальная реклама": "Interstitial реклама",
    "интерстициальная реклама": "Interstitial реклама",
    "Интерстициальные рекламные баннеры": "Interstitial реклама",
    "интерстициальные рекламные баннеры": "Interstitial реклама",
    "Интерстициальные": "Interstitial",
    "интерстициальные": "Interstitial",
    "Интерстициальная": "Interstitial",
    "интерстициальная": "Interstitial",
    // Rewarded variants  
    "Rewarded рекламы": "Rewarded реклама",
    "Rewarded рекламе": "Rewarded рекламе",
  };
  
  let result = text;
  for (const [wrong, correct] of Object.entries(fixes)) {
    result = result.replace(new RegExp(wrong, "g"), correct);
  }
  
  return result;
}

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { text, targetLanguage } = body as { 
      text: string; 
      targetLanguage: "en" | "ru";
    };

    if (!text || text.trim() === "") {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a professional translator specializing in game testing feedback.

### CRITICAL RULES - FOLLOW STRICTLY:
1. Translate ONLY the general text, NOT technical terms or proper nouns
2. Keep ALL formatting exactly as is: [brackets], "•" bullets, line breaks
3. URLs must remain unchanged
4. Section headers in [brackets] should be translated to Russian

### TERMS THAT MUST NEVER BE TRANSLATED - KEEP IN ENGLISH ALWAYS:
- Game Ready
- Interstitial (and "Interstitial ads")
- Rewarded (and "Rewarded ads")
- Bridge
- WebAssembly / WASM
- Social Share
- VK

### TEXT IN QUOTES THAT MUST NEVER BE TRANSLATED:
- "Watch Ad"
- "Continue without reward"  
- "AD"
- "Opened"
- "Closed"
- "SDK"
- Any quoted button labels or UI text

### EVENT NAMES THAT MUST NEVER BE TRANSLATED:
- visibilityStateChanged

### CORRECT EXAMPLES:
English: "The game does not pause during Interstitial ads"
Russian: "Игра не ставится на паузу во время Interstitial рекламы"

English: "Game Ready is not being sent"
Russian: "Game Ready не отправляется"

English: "Add a 'Watch Ad' label"
Russian: "Добавьте подпись 'Watch Ad'"

Output ONLY the translated text with preserved formatting, nothing else.`;

    const userPrompt = `Translate the following game testing feedback to ${targetLanguage === "ru" ? "Russian" : "English"}:

---
${text.trim()}
---

Provide ONLY the translated text, preserving all formatting, headers, and bullet points.`;

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0,
        max_tokens: 2000,
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
      let translatedText = data.choices[0].message.content.trim();
      // Fix any incorrectly translated technical terms
      translatedText = fixTechnicalTerms(translatedText, targetLanguage);
      return NextResponse.json({ translatedText });
    }

    return NextResponse.json(
      { error: "Unexpected response format from OpenAI API" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error translating feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
