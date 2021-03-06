[![Build Status](https://travis-ci.org/actano/rplan-express-middleware.svg?branch=master)](https://travis-ci.org/actano/rplan-express-middleware)

@rplan/express-middleware
================

# Introduction

This is a collection of reusable express middlewares for logging and error handling

A NodeJs server should at least be set up with the following middleware: 
```javascript
import { requestIdMiddleware, requestLogger, loggingHandler } from '@rplan/express-middleware'
// provides the requestId (part of the req header, set by the api gateway)
app.use(requestIdMiddleware())
// provides a request logger configured with request and reqId
app.use(requestLogger())
// does request logging (needed by our security guidelines)
app.use(loggingHandler(HANDLER_LOG_LEVEL.INFO))
app.use(someRoute)
```

## catchAsyncErrors

A middleware wrapper that catches errors of the underlying middleware 
and pass it to the next function

```javascript

  app.get('/some-route', catchAsyncErrors(async (req, res) => {
    if (errorCondition) {
      throw new Error('foo') // error can now be handled in a error middleware
    }
    // ...
  }))

```


## unexpectedErrorHandler

This middleware sends the http status code 500 to the client, if an unexpected error occurs.
The error is logged with the module `@rplan/logger`.

The `unexpectedErrorHandler` should be added as the last middleware to the express app.

Example for adding the middleware:

```javascript
  import express from 'express'
  import { unexpectedErrorHandler } from '@rplan/express-middleware'
  
  // ...
  
  const app = express()
  
  app.use(someRoute)
  
  app.use(unexpectedErrorHandler)

```

## expectedErrorHandler

This middleware sends a http status code 4xx, if an expected error occurs.
The error is logged with the module `@rplan/logger`.
Place the middleware at the end, but before the `unexpectedErrorHandler`.

Example for adding the middleware:

```javascript
  import express from 'express'
  import { expectedErrorHandler, unexpectedErrorHandler } from '@rplan/express-middleware'
  
  // ...
  
  const app = express()
  
  app.use(someRoute)
  
  app.use(expectedErrorHandler)
  app.use(unexpectedErrorHandler)

```

### Predefined standard errors

There are the following standard errors defined:

- NotFoundError (sends 404)
- ConflictError (sends 409)
- BadRequestError (sends 400)
- ForbiddenError (sends 403)
- UnauthorizedError (sends 401)

```javascript
  app.get('/some-route', catchAsyncErrors(async (req, res) => {
    if (notFoundCondition) {
      throw new NotFoundError('foo') 
      // middleware sends status 404 with the body { name: 'NotFoundError', message: 'foo' }
    }
    // ...
  }))
```
`
### Custom errors

With the function `registerError` custom errors can be registered together with a http status code.

```javascript
    // custom error declaration
    export class CustomError extends Error {}
    CustomError.prototype.name = CustomError.name

    // register the error
    import { registerError } from '@rplan/express-middleware'
    registerError(CustomError, 442)

    // throw the error
    app.get('/some-route', catchAsyncErrors(async (req, res) => {
      if (customFoundCondition) {
        throw new CustomError('custom') 
        // middleware sends status 442 with body { name: 'CustomError', message: 'custom' }
      }
      // ...
    }))
```

Make sure that the name property of the error is unique, errors with same name cant be registered
twice. 

The message of the error is exposed to the calling client. Make sure that the error message 
do not contain any security information, like session ids. 

## loggingHandler

Add standardized logging in the same manner as in the rplan monolith. 

Using this middleware can help to have a uniform standard logging of requests 
and to have unique indexes in elk/ kibana stack.

This middleware should be placed at the top and use `@rplan/logger` for logging.

 
```javascript
  import express from 'express'
  import { loggingHandler, HANDLER_LOG_LEVEL } from '@rplan/express-middleware'
  
  // ...
  
  const app = express()
  
  app.use(loggingHandler(HANDLER_LOG_LEVEL.INFO))
  
  app.use(someRoute)

```

## requestMetrics

Collect metrics of requests based on the request method, path and response status code. The metrics
are collected with `prom-client` which should be made available as a peer dependency. The middleware
only collects metrics but doesn't provide an endpoint for prometheus itself. A metrics endpoint has
to be provided on its own using `prom-client`.

The following metrics are collected:
* `http_requests_total` - Counts all requests using labels for `method`, `path` and `status`
* `http_request_duration_ms` - Collects response times in a histogram using labels for `method`, 
  `path` and `status`
  
Options:
* `pathPatterns` - array of express path patterns which are used to normalize paths. This is helpful
  for endpoints which contain path parameters and will collect all corresponding requests with the
  pattern as `path` label
* `ignoredPaths` - array of paths to ignore for metric collection. Also recognizes path patterns.
* `requestDurationBuckets` - the buckets to use for the request duration histogram

```javascript
import express from 'express'
import { requestMetrics } from '@rplan/express-middleware'

const app = express()

app.use(requestMetrics({
  pathPatterns: [
    '/foo/:id',
    '/foo/:id/test',
  ],
  ignoredPaths: [
    '/metrics',
  ],
  requestDurationBuckets: [10, 100, 1000, 2000],
}))

app.get('/foo/:id', (req, res) => {
  // ....
})
```

## detectAbortedRequests

Detects if the client side aborted/closed the request prematurely. In case the request is detected
as aborted it will create a corresponding log entry. Additionally, this middleware provides an API
for checking if the request has been aborted.

```javascript
import express from 'express'
import { 
  detectAbortedRequests,
  isAbortedByClient,
  HANDLER_LOG_LEVEL,
} from '@rplan/express-middleware'

const app = express()

app.use(detectAbortedRequests({
  logLevel: HANDLER_LOG_LEVEL.INFO,
}))

app.get('/foo/:id', (req, res) => {
  if (isAbortedByClient(req)) {
    // do something if aborted
  } else {
    // ...
  }
})
```

## requestIdMiddleware

Ensures that each request gets a unique id which can be used for correlation, e.g. to correlate all
log entries which belong to a particular request. Takes either a client provided request id from
the `x-request-id` header or generates a new request id.


```javascript
import express from 'express'
import {
  requestIdMiddleware,
  getRequestId,
  requestLogger,
  loggingHandler,
} from '@rplan/express-middleware'

const app = express()
app.use(requestIdMiddleware())
app.use(requestLogger())
app.use(loggingHandler())

app.use('/foo', (req, res) => {
  const requestId = getRequestId(res)
  // ...
})
```

## requestContext

The `requestContext` middleware provides a convenient API for request scoped properties. The base
version provides access to the request id and request logger (requires the corresponding middlewares)
but the context can be extended by the consumer as needed.

```javascript
import express from 'express'
import {
  initializeRequestContext,
  RequestContextBase,
  requestIdMiddleware,
  requestLogger,
  loggingHandler,
} from '@rplan/express-middleware'

const {
  requestContext,
  getRequestContext,
} = initializeRequestContext(req => new RequestContextBase())

const app = express()
app.use(requestIdMiddleware())
app.use(requestLogger())
app.use(loggingHandler())
app.use(requestContext)

app.get('/foo', (req, res) => {
  const ctx = getRequestContext(req)
  ctx.getLogger().info('logging via request context logger')
  // ...
})
```

## handleServerLifecycle

Provides a convenient method for gracefully handling the whole HTTP server lifecycle from startup to
shutdown. In particular callbacks for startup and shutdown can be provided to be notified when the
HTTP server started listening and to run cleanup on server shutdown. Additionally it provides a
graceful shutdown period to normally complete still running requests without accepting new requests.

```javascript
import express from 'express'
import {
  handleServerLifecycle,
} from '@rplan/express-middleware'

const app = express()

app.get('/foo', (req, res) => {
  // ...
})

async function main() {
  const shutdownServer = await handleServerLifecycle(
    app,
    3000,
    {
      onStart() {
        console.log('server started')
      },
      onShutdown() {
        console.log('server shutting down')
        // do cleanup
      },
    }
  )
  
  // shut down server programmatically
  setTimeout(shutdown, 10000)
}
```
