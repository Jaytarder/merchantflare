export class PlatformPersistenceUnavailableError extends Error {
  constructor() {
    super("Platform services require DATABASE_URL.");
    this.name = "PlatformPersistenceUnavailableError";
  }
}

export class PlatformNotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} was not found.`);
    this.name = "PlatformNotFoundError";
  }
}

export class PlatformConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformConflictError";
  }
}

export class PlatformValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformValidationError";
  }
}
