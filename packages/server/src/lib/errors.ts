export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class BadRequest extends AppError {
  constructor(message: string) {
    super(400, message);
    this.name = "BadRequest";
  }
}

export class NotFound extends AppError {
  constructor(message = "Not found") {
    super(404, message);
    this.name = "NotFound";
  }
}

export class Conflict extends AppError {
  constructor(message: string) {
    super(409, message);
    this.name = "Conflict";
  }
}
