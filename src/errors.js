class HttpError extends Error {}
HttpError.prototype.name = HttpError.name

class ClientError extends HttpError {}
ClientError.prototype.name = ClientError.name

class NotFoundError extends ClientError {}
NotFoundError.prototype.name = NotFoundError.name

class ConflictError extends ClientError {}
ConflictError.prototype.name = ConflictError.name

class BadRequestError extends ClientError {}
BadRequestError.prototype.name = BadRequestError.name

class ForbiddenError extends ClientError {}
ForbiddenError.prototype.name = ForbiddenError.name

class UnauthorizedError extends ClientError {}
UnauthorizedError.prototype.name = UnauthorizedError.name

const isClientError = error => error instanceof ClientError

export {
  HttpError,
  ClientError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
  isClientError,
}
