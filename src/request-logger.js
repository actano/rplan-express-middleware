import createLogger from '@rplan/logger'

import { requestSerializer } from './serializer/request'
import { responseSerializer } from './serializer/response'
import { getRequestId } from './request-id'

const logger = createLogger('express-middleware')

const LOGGER_PROPERTY = Symbol('logger_property')

logger.addSerializers({
  request: requestSerializer,
  response: responseSerializer,
})

const getRequestLogger = req => req[LOGGER_PROPERTY]

const requestLogger = () => (request, response, next) => {
  const requestId = getRequestId(request)

  request[LOGGER_PROPERTY] = logger.child({
    request,
    requestId,
  })

  next()
}

export {
  requestLogger,
  getRequestLogger,
}
