import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { imageBase64 } = await req.json();

  if (!imageBase64) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // If key not configured, let posts through
    return NextResponse.json({ outdoor: true });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Is this photo taken outdoors? Reply with only YES or NO. Outdoors means outside a building — sky, street, park, garden, etc. A photo clearly taken indoors (bedroom, office, inside a vehicle, screen/monitor) is NO.",
            },
            {
              type: "image_url",
              image_url: { url: imageBase64, detail: "low" },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    // On API error, fail open so users aren't blocked
    console.error("OpenAI error", await response.text());
    return NextResponse.json({ outdoor: true });
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content?.trim().toUpperCase() ?? "";
  const outdoor = answer.startsWith("YES");

  return NextResponse.json({ outdoor });
}
