export class MercuryPersistenceUnavailableError extends Error {
  constructor() {
    super("Mercury persistence requires DATABASE_URL.");
    this.name = "MercuryPersistenceUnavailableError";
  }
}

export class MercuryPlanNotFoundError extends Error {
  constructor() {
    super("Mercury plan was not found.");
    this.name = "MercuryPlanNotFoundError";
  }
}

export class MercuryWorkflowConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MercuryWorkflowConflictError";
  }
}
