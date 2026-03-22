import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

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

Your task is to translate the provided feedback text while preserving:
1. All formatting (headers in [brackets], bullet points with "•")
2. All URLs and technical terms
3. The professional tone and structure

### TRANSLATION RULES:
- Translate naturally while keeping the meaning accurate
- Preserve all [Section Headers] format
- Keep bullet points starting with "•"
- Do not add or remove any information
- Maintain the same structure and layout
- URLs should remain unchanged
- Technical terms should be translated appropriately for the gaming/QA context

Output ONLY the translated text, nothing else.`;

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
        model: "gpt-3.5-turbo",
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
        temperature: 0.2,
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
      const translatedText = data.choices[0].message.content.trim();
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
