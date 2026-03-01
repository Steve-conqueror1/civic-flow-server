export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}
