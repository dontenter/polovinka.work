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
    const { notes, language = "en", existingFeedback, type = "bugs" } = body as { 
      notes: string; 
      language?: "en" | "ru";
      existingFeedback?: string;
      type?: "bugs" | "suggestions";
    };
    
    const isSuggestions = type === "suggestions";

    if (!notes || notes.trim() === "") {
      return NextResponse.json(
        { error: "No notes provided" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a professional QA engineer who writes structured game testing feedback.

Your task is to transform informal notes into professional, well-structured feedback.

### CRITICAL RULES - FOLLOW STRICTLY:
1. DO NOT invent, add, or hallucinate any information not present in the user's notes
2. Use ONLY the facts and issues described by the user
3. DO NOT add extra details, examples, or consequences that the user didn't mention
4. Your job is ONLY to rephrase the user's notes into professional format, not to expand them

### OUTPUT FORMAT - BUGS (for critical issues):
[Section Name]
• Professional rephrasing of the user's note (clear, actionable, direct)

### OUTPUT FORMAT - SUGGESTIONS (for optional improvements):
• Professional rephrasing using soft, suggestive language
• Use phrases like "Consider adding...", "Could benefit from...", "Might enhance experience by..."
• DO NOT use headers like [Background Music] inside suggestions
• Keep it as a simple bullet list
• Tone should be advisory, not demanding
• No "should", "must", "please add" - use "could", "might", "consider" instead

### FORMATTING RESTRICTIONS:
- NEVER use markdown syntax like ###, ##, or #
- Headers ONLY in format: [Header Name] - no other formatting
- Bullet points start with "• " (bullet character), not "- " or "* "
- NEVER add words like "BUGS", "ISSUES", "PROBLEMS" before sections
- Output format is STRICTLY: [Header] followed by bullet points, nothing else

Transform the user's informal notes into this format. Maintain the same language as the input. DO NOT add anything the user didn't write.`;

    const userPrompt = `Language: ${language === "ru" ? "Russian" : "English"}

${existingFeedback ? `EXISTING FEEDBACK FOR REFERENCE (match this style):
---
${existingFeedback}
---

` : ""}TYPE: ${isSuggestions ? "SUGGESTIONS (optional improvements - use soft, advisory tone)" : "BUGS (critical issues - use clear, direct tone)"}

USER NOTES TO TRANSFORM (use ONLY these facts, do not add anything):
${notes.trim()}

Transform these notes into professional feedback format. 
${isSuggestions 
  ? `- Use soft, suggestive language ('Consider...', 'Could...', 'Might...')\n- NO section headers inside the output\n- Simple bullet list only\n- Advisory tone, not demanding` 
  : `- Use clear, actionable tone\n- Group under appropriate section headers like [Section Name]\n- Direct and specific`
}
- CRITICAL: Output ONLY headers in [brackets] and bullet points. NO words like BUGS, ISSUES before headers
- IMPORTANT: Include ONLY what the user wrote above. Do not add examples, consequences, or details not mentioned by the user.`;

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
        max_tokens: 1500,
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
      const enhancedFeedback = data.choices[0].message.content.trim();
      return NextResponse.json({ enhancedFeedback });
    }

    return NextResponse.json(
      { error: "Unexpected response format from OpenAI API" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error enhancing feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
