import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { answerQuestion, llmConfigured } from "@/lib/support/assistant";
import { questionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // above the 12 s model timeout

export const GET = handle(async () =>
  NextResponse.json({ mode: llmConfigured() ? "ai" : "demo" }),
);

export const POST = handle(async (request) => {
  const { question, lang } = questionSchema.parse(await readJson(request));
  return NextResponse.json(await answerQuestion(question, lang));
});
