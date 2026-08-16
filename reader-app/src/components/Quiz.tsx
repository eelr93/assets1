"use client";

import { useState } from "react";

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; questions: QuizQuestion[] };

export function Quiz({
  bookTitle,
  chapterTitle,
  chapterText,
}: {
  bookTitle: string;
  chapterTitle: string;
  chapterText: string;
}) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);

  const generate = async () => {
    setState({ status: "loading" });
    setAnswers({});
    setChecked(false);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookTitle, chapterTitle, text: chapterText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo generar el quiz.");
      setState({ status: "ready", questions: data.questions });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Error inesperado." });
    }
  };

  const score =
    state.status === "ready"
      ? state.questions.filter((q, i) => answers[i] === q.correctIndex).length
      : 0;

  return (
    <div
      className="mt-10 rounded-xl border p-5"
      style={{ borderColor: "color-mix(in srgb, var(--read-fg) 20%, transparent)" }}
    >
      {state.status === "idle" && (
        <button
          onClick={generate}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold"
          style={{ background: "var(--read-fg)", color: "var(--read-bg)" }}
        >
          Poné a prueba tu comprensión
        </button>
      )}

      {state.status === "loading" && <p className="text-sm opacity-70">Generando preguntas…</p>}

      {state.status === "error" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-red-500">{state.message}</p>
          <button onClick={generate} className="self-start text-sm underline opacity-80">
            Reintentar
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <div className="flex flex-col gap-6">
          <h3 className="text-base font-bold">¿Cuánto recordás de este capítulo?</h3>
          {state.questions.map((q, qi) => (
            <fieldset key={qi} className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold">
                {qi + 1}. {q.question}
              </legend>
              {q.options.map((opt, oi) => {
                const selected = answers[qi] === oi;
                const isCorrect = oi === q.correctIndex;
                const showResult = checked;
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={checked}
                    onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm"
                    style={{
                      borderColor: showResult && isCorrect
                        ? "#4ade80"
                        : showResult && selected && !isCorrect
                        ? "#f87171"
                        : "color-mix(in srgb, var(--read-fg) 25%, transparent)",
                      background: selected && !showResult ? "color-mix(in srgb, var(--read-fg) 10%, transparent)" : "transparent",
                    }}
                  >
                    <span>{opt}</span>
                  </button>
                );
              })}
              {checked && (
                <p className="text-xs opacity-70">
                  {answers[qi] === q.correctIndex ? "✓ Correcto. " : "✗ "}
                  {q.explanation}
                </p>
              )}
            </fieldset>
          ))}

          {!checked ? (
            <button
              onClick={() => setChecked(true)}
              disabled={Object.keys(answers).length < state.questions.length}
              className="self-start rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
              style={{ background: "var(--read-fg)", color: "var(--read-bg)" }}
            >
              Verificar respuestas
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium">
                Resultado: {score} de {state.questions.length}
              </p>
              <button onClick={generate} className="text-sm underline opacity-80">
                Generar otro quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
