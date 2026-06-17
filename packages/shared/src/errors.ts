export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
};

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail: string,
    public readonly typeSlug = "error"
  ) {
    super(detail);
    this.name = "AppError";
  }

  toProblem(instance?: string): ProblemDetails {
    return {
      type: `https://obos.app/errors/${this.typeSlug}`,
      title: this.title,
      status: this.status,
      detail: this.detail,
      instance,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(detail = "Resource not found") {
    super(404, "Not Found", detail, "not-found");
  }
}

export class ForbiddenError extends AppError {
  constructor(detail = "Forbidden") {
    super(403, "Forbidden", detail, "forbidden");
  }
}

export class UnauthorizedError extends AppError {
  constructor(detail = "Unauthorized") {
    super(401, "Unauthorized", detail, "unauthorized");
  }
}

export class BadRequestError extends AppError {
  constructor(detail = "Bad request") {
    super(400, "Bad Request", detail, "bad-request");
  }
}

export class ConflictError extends AppError {
  constructor(detail = "Conflict") {
    super(409, "Conflict", detail, "conflict");
  }
}

export class TooManyRequestsError extends AppError {
  constructor(detail = "Too many requests") {
    super(429, "Too Many Requests", detail, "rate-limit");
  }
}
