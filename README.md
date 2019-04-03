@rplan/express-middleware
================

# Introduction

This is a collection of reusable express middlewares for logging and error handling


# catchAsyncErrors

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


# unexpectedErrorHandler

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

# expectedErrorHandler

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

## Predefined standard errors

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
      // middleware sends status 404 with the body { message: 'foo' }
    }
    // ...
  }))
```
`
## Custom errors

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
        // middleware sends status 442 with body { message: 'custom' }
      }
      // ...
    }))
```

# loggingHandler

Add standardized logging in the same manner as in the rplan monolith. 

Using this middleware can help to have a uniform standard logging of requests 
and to have unique indexes in elk/ kibana stack.

This middleware should be placed at the top and use `@rplan/logger` for logging.

 
```javascript
  import express from 'express'
  import { loggingHandler } from '@rplan/express-middleware'
  
  // ...
  
  const app = express()
  
  app.use(loggingHandler)
  
  app.use(someRoute)

```
