export class NotFoundError extends Error {}
NotFoundError.prototype.name = NotFoundError.name

export class ConflictError extends Error {}
ConflictError.prototype.name = ConflictError.name

export class BadRequestError extends Error {}
BadRequestError.prototype.name = BadRequestError.name

export class ForbiddenError extends Error {}
ForbiddenError.prototype.name = ForbiddenError.name

export class UnauthorizedError extends Error {}
UnauthorizedError.prototype.name = UnauthorizedError.name
