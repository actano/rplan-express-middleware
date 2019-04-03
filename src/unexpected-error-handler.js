import * as HttpStatus from 'http-status-codes'
import createLogger from '@rplan/logger'

const logger = createLogger('express-middleware')

export const unexpectedErrorHandler = (err, req, res, next) => {
  logger.error({ err }, 'unexpected error')

  if (res && res.headersSent) {
    next()
    return
  }

  res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR).end()
  next()
}
