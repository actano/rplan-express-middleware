import * as HttpStatus from 'http-status-codes'
import createLogger from '@rplan/logger'
import { getRequestLogger } from './logging-handler'

const defaultLogger = createLogger('express-middleware')

// We need to have 4 arguments according to the express API
// eslint-disable-next-line no-unused-vars
export const unexpectedErrorHandler = (err, req, res, next) => {
  const logger = getRequestLogger(req) || defaultLogger

  if (res && res.headersSent) {
    logger.error({ err }, 'unexpected error after response was sent')
    return
  }

  if (err.status) {
    // errors with status prop are meant to respond (also default behaviour of express)
    // they are thrown by various middleware e.g. body-parser on parsing errors
    if (err.status < 500) {
      logger.debug({ err }, `handled http error: ${err.name}`)
    } else {
      logger.error({ err }, 'unexpected error')
    }
    res.sendStatus(err.status)
    return
  }

  logger.error({ err }, 'unexpected error')
  res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR).end()
}
