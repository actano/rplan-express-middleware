import createLogger from '@rplan/logger'

import { requestSerializer } from './serializer/request'
import { responseSerializer } from './serializer/response'

const logger = createLogger('express-middleware')

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

const loggingHandler = (logLevel = HANDLER_LOG_LEVEL.DEBUG) => {
  const log = getLogFn(logLevel)

  return (request, response, next) => {
    const { method, url } = request
    if (method !== 'HEAD') {
      const statistics = {}
      const startTime = process.hrtime()
      let logged = false

      const logFinish = () => {
        if (logged) {
          return
        }
        logged = true
        const timeDelta = process.hrtime(startTime)
        statistics.duration = (timeDelta[0] * 1e9) + timeDelta[1]

        log({ statistics, request, response }, 'req finished: %s %s', method, url)
      }

      log('req started: %s %s', method, url)

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
  HANDLER_LOG_LEVEL,
}
