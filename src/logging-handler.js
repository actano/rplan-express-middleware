import createLogger from '@rplan/logger'

import { requestSerializer } from './serializer/request'
import { responseSerializer } from './serializer/response'
import { getRequestId } from './request-id'

const logger = createLogger('express-middleware')

const LOGGER_PROPERTY = Symbol('logger_property')

const STATISTICS_PROPERTY = Symbol('statistics_property')

logger.addSerializers({
  request: requestSerializer,
  response: responseSerializer,
})

const HANDLER_LOG_LEVEL = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
}

const getLogFn = (logLevel) => {
  switch (logLevel) {
    case HANDLER_LOG_LEVEL.TRACE:
      return logger.trace.bind(logger)
    case HANDLER_LOG_LEVEL.DEBUG:
      return logger.debug.bind(logger)
    case HANDLER_LOG_LEVEL.INFO:
      return logger.info.bind(logger)
    default:
      return logger.debug.bind(logger)
  }
}

const getRequestLogger = req => req[LOGGER_PROPERTY]

const addRequestStatistics = (req, key, value) => {
  const statistics = req[STATISTICS_PROPERTY]
  if (statistics == null) {
    return
  }

  statistics[key] = value
}

const loggingHandler = (logLevel = HANDLER_LOG_LEVEL.DEBUG) => {
  const log = getLogFn(logLevel)

  return (request, response, next) => {
    const { method, url } = request
    if (method !== 'HEAD') {
      const requestId = getRequestId(request)

      request[LOGGER_PROPERTY] = logger.child({
        request,
        requestId,
      })

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
}

export {
  loggingHandler,
  getRequestLogger,
  addRequestStatistics,
  HANDLER_LOG_LEVEL,
}
