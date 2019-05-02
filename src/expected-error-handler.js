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

const registerError = (errorClass, httpStatusCode, msgOrOptions) => {
  if (errorRegistry.has(errorClass.name)) {
    throw new Error(`Missconfiguration, an error with name '${errorClass.name}' is already registered`)
  }
  const options = typeof msgOrOptions === 'object'
    ? msgOrOptions
    : { httpResponseMsg: msgOrOptions }
  errorRegistry.set(errorClass.name, {
    errorClass,
    httpStatusCode,
    options,
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

const createMsg = (errorEntry, error) => {
  const o = errorEntry.options
  if (o.httpResponseMsg) {
    const t = typeof o.httpResponseMsg
    if (t === 'function') return o.httpResponseMsg(error)
    if (t === 'string') return o.httpResponseMsg
  }

  return error.message
}

const expectedErrorHandler = (err, req, res, next) => {
  if (res && res.headersSent) {
    next()
    return
  }

  for (const errorEntry of errorRegistry.values()) {
    if (err instanceof errorEntry.errorClass) {
      logger.debug({ err }, `handled expected error: ${err.name}`)

      const { name } = err
      const message = createMsg(errorEntry, err)
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
