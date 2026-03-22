import { NextRequest, NextResponse } from "next/server";

const QA_OPENAI_API_KEY = process.env.QA_OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(request: NextRequest) {
  // Check if API key is configured
  if (!QA_OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { questions } = body as { questions: { label: string; answer: string }[] };

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "No questions provided" },
        { status: 400 }
      );
    }

    // Filter out empty or skipped answers
    const validQA = questions.filter(
      (q) =>
        q.answer &&
        q.answer.trim() !== "" &&
        q.answer.trim() !== "-" &&
        !q.answer.toLowerCase().includes("неприменимо") &&
        !q.answer.toLowerCase().includes("нет информации")
    );

    if (validQA.length === 0) {
      return NextResponse.json(
        { error: "No valid answers to process" },
        { status: 400 }
      );
    }

    // Format data as A1:B20 style
    const dataSection = validQA
      .map((q, i) => `A${i + 1}:${q.label}\nB${i + 1}:${q.answer}`)
      .join("\n");

    const systemPrompt = `Act as a professional game localizer and editor. Your task is to translate a list of game-related questions and answers from Russian to native, natural-sounding English.

### INSTRUCTIONS:
1. TRANSLATION: Translate the content accurately but make it sound like it was written by a native English speaker.
2. FILTERING: If the Russian answer contains a dash ('-'), words like 'неприменимо', 'нет информации', or is empty, SKIP this question entirely. Do not include it in the output.
3. GROUPING: Group questions into these 5 headers ONLY: 
   - [Core Gameplay & Story]
   - [Mechanics & Progression]
   - [Economy & Customization]
   - [Retention & Engagement]
   - [Multiplayer] (if applicable)
4. FORMATTING (Strictly follow):
   - Use TWO line breaks before every Header.
   - Use ONE line break between Question and Answer.
   - Use TWO line breaks after every Answer.
   - Format questions as 'Q: [Question]' and answers as 'A: [Answer]'.

### CATEGORY MAPPING:
- Core Gameplay & Story: (About the game, Storyline, Unique features, Engaging content)
- Mechanics & Progression: (Bosses, How to level up, Mini-games, Number of levels)
- Economy & Customization: (Currencies, In-app purchases, Character/Vehicle customization)
- Retention & Engagement: (Leaderboards, Daily rewards, Sound/Atmosphere, Achievements)
- Multiplayer: (Online chat, Real-time, Friends, Room size)`;

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${QA_OPENAI_API_KEY}`,
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
            content: `### DATA TO PROCESS:\n${dataSection}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2048,
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
    console.error("Error generating description:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
