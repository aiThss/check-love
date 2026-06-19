import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = "APP_ERROR"
  ) {
    super(message);
  }
}

export function formatError(error: unknown) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: { error: error.message, code: error.code }
    };
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return {
      statusCode: 400,
      body: {
        error: firstIssue?.message ?? "Invalid request",
        code: "VALIDATION_ERROR"
      }
    };
  }

  if (typeof error === "object" && error && "code" in error && error.code === 11000) {
    return {
      statusCode: 409,
      body: { error: "Data already exists", code: "DUPLICATE_DATA" }
    };
  }

  return {
    statusCode: 500,
    body: { error: "Something went wrong", code: "INTERNAL_ERROR" }
  };
}
