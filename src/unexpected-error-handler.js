import * as HttpStatus from 'http-status-codes'
import createLogger from '@rplan/logger'

const logger = createLogger('express-middleware')

// We need to have 4 arguments according to the express API
// eslint-disable-next-line no-unused-vars
export const unexpectedErrorHandler = (err, req, res, next) => {
  if (res && res.headersSent) {
    logger.error({ err }, 'unexpected error after response was sent')
    return
  }

  if (err.status) {
    // errors with status prop are meant to respond (also default behaviour of express)
    // they are thrown by various middleware e.g. body-parser on parsing errors
    logger.debug({ err }, `handled http error: ${err.name}`)
    res.sendStatus(err.status)
    return
  }

  logger.error({ err }, 'unexpected error')
  res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR).end()
}
