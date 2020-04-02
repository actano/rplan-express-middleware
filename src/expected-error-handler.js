import * as HttpStatus from 'http-status-codes'
import createLogger from '@rplan/logger'

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from './errors'
import { getRequestLogger } from './logging-handler'

const defaultLogger = createLogger('express-middleware')

const errorRegistry = new Map()

const registerError = (errorClass, httpStatusCode) => {
  if (errorRegistry.has(errorClass.name)) {
    throw new Error(`an error with name '${errorClass.name}' is already registered`)
  }
  errorRegistry.set(errorClass.name, {
    errorClass,
    httpStatusCode,
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
    next(err)
    return
  }

  for (const errorEntry of errorRegistry.values()) {
    if (err instanceof errorEntry.errorClass) {
      const logger = getRequestLogger(req) || defaultLogger
      logger.debug({ err }, `handled expected error: ${err.name}`)

      res.status(errorEntry.httpStatusCode).json({
        name: err.name,
        message: err.message,
      })

      return
    }
  }

  next(err)
}

export {
  expectedErrorHandler,
  registerError,
}
