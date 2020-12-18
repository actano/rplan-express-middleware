import get from 'lodash/get'
import createLogger from '@rplan/logger'

import { getRequestLogger } from './request-logger'
import { bindLogger, HANDLER_LOG_LEVEL } from './logging-helper'

const logger = createLogger('express-middleware.detect-aborted-requests')
const ABORTED_BY_CLIENT_PROPERTY = Symbol('aborted_by_client')

const getLogFn = (req, logLevel) => {
  const requestLogger = getRequestLogger(req)
  if (requestLogger == null) {
    return bindLogger(logger, logLevel)
  }
  return bindLogger(requestLogger, logLevel)
}

const detectAbortedRequests = (options = {}) => (req, res, next) => {
  const logLevel = get(options, 'logLevel', HANDLER_LOG_LEVEL.DEBUG)

  let finished = false
  const log = getLogFn(req, logLevel)
  req[ABORTED_BY_CLIENT_PROPERTY] = false

  res.on('finish', () => {
    finished = true
  })

  res.on('close', () => {
    if (!finished) {
      log('request seems to have been aborted by the client')
      req[ABORTED_BY_CLIENT_PROPERTY] = true
    }
  })

  next()
}

const isAbortedByClient = req => req[ABORTED_BY_CLIENT_PROPERTY] || false

export {
  detectAbortedRequests,
  isAbortedByClient,
}
