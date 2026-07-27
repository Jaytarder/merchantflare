const idempotencyKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export function readIdempotencyKey(request: Request) {
  const value = request.headers.get("Idempotency-Key")?.trim();
  return value || undefined;
}

export function isValidIdempotencyKey(value?: string) {
  return value === undefined || idempotencyKeyPattern.test(value);
}
