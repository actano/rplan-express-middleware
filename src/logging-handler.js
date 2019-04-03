import createLogger from '@rplan/logger'

import { requesetSerializer } from './serializer/request'
import { responseSerializer } from './serializer/response'

const logger = createLogger('express-middleware')

logger.addSerializers({
  request: requesetSerializer,
  response: responseSerializer,
})

const loggingHandler = (request, response, next) => {
  const { method, url } = request
  if (method !== 'HEAD') {
    const statistics = {}
    const startTime = process.hrtime()
    let logged = false

    const logFinish = (event) => {
      if (logged) {
        return
      }
      logged = true
      const timeDelta = process.hrtime(startTime)
      statistics.duration = (timeDelta[0] * 1e9) + timeDelta[1]

      logger.debug({ statistics, request, response }, 'req finished: %s %s (%s)', method, url, event)
    }

    logger.debug('req started: %s %s', method, url)

    // When running in HTTP/2 mode via `spdy` the `finish` event doesn't seem to be emitted.
    // Instead the `close` event is emitted which usually indicates premature connection resets.
    // In order to not lose the finish log entry we try to log it in the `close` or `finish`
    // event, whichever comes first. (See https://github.com/spdy-http2/node-spdy/issues/327)
    response.on('close', () => logFinish('close'))
    response.on('finish', () => logFinish('finish'))
  }
  next()
}

export {
  loggingHandler,
}
