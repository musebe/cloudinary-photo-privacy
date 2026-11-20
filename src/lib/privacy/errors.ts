export class PrivacyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "PrivacyError";
  }
}

export function publicError(error: unknown): PrivacyError {
  return error instanceof PrivacyError
    ? error
    : new PrivacyError(
        "processing_failed",
        "The photo could not be verified. No download was released. Please try again.",
        502,
      );
}
