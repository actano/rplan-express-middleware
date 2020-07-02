import { getRequestId } from './request-id'
import { getRequestLogger } from './logging-handler'

class RequestClosed extends Error {}
RequestClosed.prototype.name = RequestClosed.name

class RequestContextBase {
  constructor(req) {
    this.req = req

    this.requestId = getRequestId(req)
    this.logger = getRequestLogger(req)

    // The aborted property is officially documented in the node.js API but missing from the type
    // definitions
    // @ts-ignore
    this.closed = req.aborted

    req.on('close', () => {
      this.closed = true
    })
  }

  getRequestId() {
    return this.requestId
  }

  getLogger() {
    return this.logger
  }

  isClosed() {
    return this.closed
  }
}

const REQUEST_CONTEXT_PROP = Symbol('request_context_prop')

function initializeRequestContext(createContext) {
  const getRequestContext = req => req[REQUEST_CONTEXT_PROP]

  function initializeContext(req) {
    return createContext(req)
  }

  function requestContext(req, res, next) {
    if (req[REQUEST_CONTEXT_PROP] == null) {
      req[REQUEST_CONTEXT_PROP] = initializeContext(req)
    }

    next()
  }

  const isRequestClosed = context => context != null && context.isClosed()

  function ensureRequestIsRunning(context) {
    if (isRequestClosed(context)) {
      throw new RequestClosed()
    }
  }

  const isRequestClosedError = err =>
    err != null && err instanceof RequestClosed

  function handleRequestClosedError(err, req, res, next) {
    const context = getRequestContext(req)

    if (!isRequestClosedError(err) || !isRequestClosed(context)) {
      next(err)
      return
    }

    if (context != null) {
      context.getLogger().debug('handled request closed error')
    }
  }

  return {
    getRequestContext,
    requestContext,
    ensureRequestIsRunning,
    handleRequestClosedError,
  }
}

export {
  RequestContextBase,
  RequestClosed,
  initializeRequestContext,
}
