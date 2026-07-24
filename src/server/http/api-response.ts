import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { GameError } from "@/server/errors/game.errors";

export function apiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          issues: error.issues,
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof GameError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}
