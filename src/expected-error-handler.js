/* eslint-disable import/prefer-default-export */

import * as HttpStatus from 'http-status-codes'
import createLogger from '@rplan/logger'

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from './errors'

const logger = createLogger('express-middleware')

export const expectedErrorHandler = (err, req, res, next) => {
  if (res && res.headersSent) {
    next()
    return
  }

  let isExpectedError = false
  if (err instanceof NotFoundError) {
    isExpectedError = true
    res.status(HttpStatus.NOT_FOUND).json({ message: err.message })
  } else if (err instanceof ConflictError) {
    isExpectedError = true
    res.status(HttpStatus.CONFLICT).json({ message: err.message })
  } else if (err instanceof ForbiddenError) {
    isExpectedError = true
    res.status(HttpStatus.FORBIDDEN).json({ message: err.message })
  } else if (err instanceof UnauthorizedError) {
    isExpectedError = true
    res.status(HttpStatus.UNAUTHORIZED).json({ message: err.message })
  }

  if (isExpectedError) {
    logger.debug({ err }, `handled expected error: ${err.name}`)
    next()
    return
  }

  next(err)
}
