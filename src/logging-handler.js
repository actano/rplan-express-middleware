import createLogger from '@rplan/logger'

import { getRequestId } from './request-id'
import { getRequestLogger } from './request-logger'
import { bindLogger, HANDLER_LOG_LEVEL } from './logging-helper'

const STATISTICS_PROPERTY = Symbol('statistics_property')

const errorLogger = createLogger('express-middleware.logging-handler')
let loggedError = false

const noop = () => {}

const getLogFn = (logger, logLevel) => {
  if (logger == null) {
    if (!loggedError) {
      errorLogger.error('No request scoped logger found. Did you add the request logger middleware before the logging middleware?')
      loggedError = true
    }
    return noop
  }
  return bindLogger(logger, logLevel)
}

const addRequestStatistics = (req, key, value) => {
  const statistics = req[STATISTICS_PROPERTY]
  if (statistics == null) {
    return
  }

  statistics[key] = value
}

const loggingHandler = (logLevel = HANDLER_LOG_LEVEL.DEBUG) =>
  (request, response, next) => {
    const { method, url } = request
    if (method !== 'HEAD') {
      const requestId = getRequestId(request)

      const logger = getRequestLogger(request)
      const log = getLogFn(logger, logLevel)

      request[STATISTICS_PROPERTY] = {}
      const statistics = request[STATISTICS_PROPERTY]

      const startTime = process.hrtime()
      let logged = false

      const logFinish = () => {
        if (logged) {
          return
        }
        logged = true
        const timeDelta = process.hrtime(startTime)
        statistics.duration = (timeDelta[0] * 1e9) + timeDelta[1]

        let endpoint

        if (request.route != null && request.route.path != null && request.method != null) {
          endpoint = `${request.method} ${request.route.path}`
        }

        log(
          {
            requestId, statistics, request, response, endpoint,
          },
          'req finished: %s %s', method, url,
        )
      }

      log({ requestId }, 'req started: %s %s', method, url)

      // When running in HTTP/2 mode via `spdy` the `finish` event doesn't seem to be emitted.
      // Instead the `close` event is emitted which usually indicates premature connection resets.
      // In order to not lose the finish log entry we try to log it in the `close` or `finish`
      // event, whichever comes first. (See https://github.com/spdy-http2/node-spdy/issues/327)
      response.on('close', () => logFinish())
      response.on('finish', () => logFinish())
    }
    next()
  }

export {
  loggingHandler,
  addRequestStatistics,
}
