import get from 'lodash/get'
import * as HttpStatus from 'http-status-codes'

import { getRequestLogger } from './request-logger'
import { bindLogger, HANDLER_LOG_LEVEL } from './logging-helper'

const logToStdErr = (msg) => {
  // eslint-disable-next-line no-console
  console.error(msg)
}

const getLogFn = (req, logLevel) => {
  const logger = getRequestLogger(req)
  if (logger == null) {
    return logToStdErr
  }
  return bindLogger(logger, logLevel)
}

const detectAbortedRequests = (options = {}) => (req, res, next) => {
  const logLevel = get(options, 'logLevel', HANDLER_LOG_LEVEL.DEBUG)
  const statusCodeOnAbort = get(options, 'statusCodeOnAbort', HttpStatus.BAD_REQUEST)

  let finished = false
  const log = getLogFn(req, logLevel)

  res.on('finish', () => {
    finished = true
  })

  res.on('close', () => {
    if (!finished) {
      log('request seems to have been aborted by the client')
      // The request is already closed at this point but we explicitly set a status code for
      // logging purposes and end to request to let subsequent attempts to respond fail.
      res
        .status(statusCodeOnAbort)
        .end()
    }
  })

  next()
}

export {
  detectAbortedRequests,
}
