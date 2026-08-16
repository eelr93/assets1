import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 8000;
const RATE_LIMIT_WINDOW_MS = 15_000;

// Simple per-instance cooldown so an approved-but-impatient user can't hammer the
// endpoint. Not distributed-safe, but this app runs on a single small deployment.
const lastRequestAt = new Map<string, number>();

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "El generador de quiz no está configurado (falta ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ error: "Supabase no está configurado en el servidor." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Tenés que iniciar sesión." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "approved") {
    return NextResponse.json({ error: "Tu cuenta todavía no está aprobada." }, { status: 403 });
  }

  const lastAt = lastRequestAt.get(user.id) ?? 0;
  if (Date.now() - lastAt < RATE_LIMIT_WINDOW_MS) {
    return NextResponse.json({ error: "Esperá unos segundos antes de generar otro quiz." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const bookTitle = typeof body?.bookTitle === "string" ? body.bookTitle.slice(0, 300) : "";
  const chapterTitle = typeof body?.chapterTitle === "string" ? body.chapterTitle.slice(0, 300) : "";
  const text = typeof body?.text === "string" ? body.text.slice(0, MAX_TEXT_LENGTH) : "";

  if (text.trim().length < 200) {
    return NextResponse.json(
      { error: "Este capítulo es muy corto para generar un quiz." },
      { status: 400 }
    );
  }

  lastRequestAt.set(user.id, Date.now());

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_QUIZ_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system:
        "Generás quizzes cortos de comprensión de lectura en español, basados únicamente en el texto que te dan. " +
        "Las preguntas deben poder responderse solo con ese texto, sin conocimiento externo. Usá siempre la herramienta submit_quiz.",
      messages: [
        {
          role: "user",
          content: `Libro: ${bookTitle || "sin título"}\nCapítulo: ${chapterTitle || "sin título"}\n\nTexto:\n${text}\n\nGenerá entre 3 y 4 preguntas de opción múltiple (4 opciones cada una) sobre este texto.`,
        },
      ],
      tools: [
        {
          name: "submit_quiz",
          description: "Envía el quiz generado.",
          input_schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                minItems: 3,
                maxItems: 4,
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                    correctIndex: { type: "integer", minimum: 0, maximum: 3 },
                    explanation: { type: "string" },
                  },
                  required: ["question", "options", "correctIndex", "explanation"],
                },
              },
            },
            required: ["questions"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "submit_quiz" },
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("La respuesta del modelo no incluyó el quiz.");
    }

    const questions = (toolUse.input as { questions?: QuizQuestion[] }).questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("El quiz generado no tiene preguntas.");
    }

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("quiz generation failed", err);
    return NextResponse.json({ error: "No se pudo generar el quiz. Probá de nuevo." }, { status: 502 });
  }
}
