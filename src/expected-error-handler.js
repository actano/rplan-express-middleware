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

const registerError = (errorClass, httpStatusCode) => {
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
    next()
    return
  }

  for (const errorEntry of errorRegistry.values()) {
    if (err instanceof errorEntry.errorClass) {
      logger.debug({ err }, `handled expected error: ${err.name}`)

      res.status(errorEntry.httpStatusCode).json({ message: err.message })

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
