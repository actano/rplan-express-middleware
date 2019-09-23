import * as HttpStatus from 'http-status-codes'
import createLogger from '@rplan/logger'

const logger = createLogger('express-middleware')

export const unexpectedErrorHandler = (err, req, res, next) => {
  if (res && res.headersSent) {
    next()
    return
  }

  if (err.status) {
    // errors with status prop are meant to respond (also default behaviour of express)
    // they are thrown by various middleware e.g. body-parser on parsing errors
    logger.debug({ err }, `handled http error: ${err.name}`)
    res.sendStatus(err.status).send(err.message)
    next()
    return
  }

  logger.error({ err }, 'unexpected error')
  res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR).end()
  next()
}
