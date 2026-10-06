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

type AssistantMessage = z.infer<typeof requestSchema>["messages"][number];

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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The Studio assistant is not configured yet. Add GROQ_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
  const groqBody = JSON.stringify({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...payload.data.messages.map((message: AssistantMessage) => ({
        role: message.role,
        content: message.content,
      })),
    ],
    temperature: 0.4,
    max_tokens: 600,
  });
  let groqResponse: Response | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    groqResponse = await fetch(groqUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: groqBody,
      signal: AbortSignal.timeout(30_000),
    }).catch((error: unknown) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[ZOLID] Groq request failed", error);
      }
      return null;
    });

    if (groqResponse?.status !== 503 || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }

  if (!groqResponse) {
    return NextResponse.json(
      { error: "The assistant could not connect. Please try again." },
      { status: 502 },
    );
  }

  if (!groqResponse.ok) {
    console.error("[ZOLID] Groq returned an error", {
      status: groqResponse.status,
    });
    if (groqResponse.status === 503) {
      return NextResponse.json(
        { error: "Groq is busy right now. Please try again in a minute." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "The assistant is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }

  const result = (await groqResponse.json().catch(() => null)) as {
    choices?: { message?: { content?: string | null } }[];
  } | null;
  const reply = result?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    return NextResponse.json(
      { error: "The assistant returned an empty reply. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ reply });
}
