import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(12),
});

const systemPrompt = `You are Zolid Studio's AI assistant. Help users understand the app's image-to-depth-relief workflow, image requirements, available controls, exports, and credit rules. A depth relief costs 5 credits; a background-removal PNG export costs 5 credits. Uploading, previewing, and GLB export do not cost credits. Never claim you have generated or edited an image, changed an account, charged credits, or accessed a user's files. Be concise, practical, and honest about what the app can do.`;

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to use the Studio assistant." },
      { status: 401 },
    );
  }

  const payload = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!payload.success) {
    return NextResponse.json(
      { error: "Send a message of up to 2,000 characters." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The Studio assistant is not configured yet. Add GEMINI_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const geminiBody = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: payload.data.messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 600,
    },
  });
  let geminiResponse: Response | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: geminiBody,
      signal: AbortSignal.timeout(30_000),
    }).catch((error: unknown) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[ZOLID] Gemini request failed", error);
      }
      return null;
    });

    if (geminiResponse?.status !== 503 || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }

  if (!geminiResponse) {
    return NextResponse.json(
      { error: "The assistant could not connect. Please try again." },
      { status: 502 },
    );
  }

  if (!geminiResponse.ok) {
    console.error("[ZOLID] Gemini returned an error", {
      status: geminiResponse.status,
    });
    if (geminiResponse.status === 503) {
      return NextResponse.json(
        { error: "Gemini is busy right now. Please try again in a minute." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "The assistant is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }

  const result = (await geminiResponse.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const reply = result?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!reply) {
    return NextResponse.json(
      { error: "The assistant returned an empty reply. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ reply });
}
