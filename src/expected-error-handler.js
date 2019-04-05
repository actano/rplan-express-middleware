import * as HttpStatus from 'http-status-codes'
import createLogger from '@rplan/logger'

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from './errors'

const logger = createLogger('express-middleware')

const errorRegistry = new Map()

const registerError = (errorClass, httpStatusCode, httpResponseMsg) => {
  if (errorRegistry.has(errorClass.name)) {
    throw new Error(`Missconfiguration, an error with name '${errorClass.name}' is already registered`)
  }
  errorRegistry.set(errorClass.name, {
    errorClass,
    httpStatusCode,
    httpResponseMsg,
  })
}

const registerStandardErrors = () => {
  registerError(BadRequestError, HttpStatus.BAD_REQUEST)
  registerError(ConflictError, HttpStatus.CONFLICT)
  registerError(ForbiddenError, HttpStatus.FORBIDDEN)
  registerError(NotFoundError, HttpStatus.NOT_FOUND)
  registerError(UnauthorizedError, HttpStatus.UNAUTHORIZED)
}

registerStandardErrors()

const expectedErrorHandler = (err, req, res, next) => {
  if (res && res.headersSent) {
    next()
    return
  }

  for (const errorEntry of errorRegistry.values()) {
    if (err instanceof errorEntry.errorClass) {
      logger.debug({ err }, `handled expected error: ${err.name}`)

      const { name } = err
      const message = errorEntry.httpResponseMsg || err.message
      res.status(errorEntry.httpStatusCode).json({ name, message })

      next()
      return
    }
  }

  next(err)
}

export {
  expectedErrorHandler,
  registerError,
}
