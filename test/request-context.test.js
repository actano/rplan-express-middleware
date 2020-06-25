import express from 'express'
import { expect } from 'chai'
import request from 'supertest'

import {
  catchAsyncErrors,
  initializeRequestContext, loggingHandler,
  RequestContext, requestIdMiddleware,
} from '../src'

describe('request context middleware', () => {
  let server
  let getRequestContext
  let requestContext
  let ensureRequestIsRunning
  let handleRequestClosedError

  function runServer(handler, errorHandler, manualResolve) {
    const app = express()
    app.use(requestIdMiddleware())
    app.use(loggingHandler())
    app.use(requestContext)
    app.get('/some-route', catchAsyncErrors(handler))
    app.use((err, req, res, next) => {
      handleRequestClosedError(err, req, res, next)
      manualResolve()
    })
    if (errorHandler != null) {
      app.use(errorHandler)
    }
    server = app.listen()
  }

  beforeEach(() => {
    ({
      getRequestContext,
      requestContext,
      ensureRequestIsRunning,
      handleRequestClosedError,
    } = initializeRequestContext(RequestContext))
  })

  afterEach(() => {
    if (server) {
      server.close()
    }
  })

  it('should get the request context', async () => {
    let ctx
    let requestClosedWhileHandling

    runServer(async (req, res) => {
      ctx = getRequestContext(req)
      requestClosedWhileHandling = ctx.closed
      res.sendStatus(200)
    })
    const { port } = server.address()

    await request(`http://localhost:${port}`).get('/some-route')

    expect(ctx != null).to.equal(true)
    expect(ctx.requestId).to.be.a('string')
    expect(ctx.logger != null).to.equal(true)
    expect(requestClosedWhileHandling).to.equal(false)
    expect(ctx.closed).to.equal(true)
  })

  it('should handle closed requests', async () => {
    let ctx
    let errorHandlerCalled = false
    let manualResolve

    const manualPromise = new Promise((resolve) => {
      manualResolve = resolve
    })

    runServer(
      async (req, res) => {
        await new Promise((resolve) => {
          setTimeout(resolve, 100)
        })
        ctx = getRequestContext(req)
        ensureRequestIsRunning(ctx)
        res.sendStatus(200)
        manualResolve()
      },
      // required by express api
      // eslint-disable-next-line no-unused-vars
      (err, req, res, next) => {
        errorHandlerCalled = true
        manualResolve()
      },
      manualResolve,
    )
    const { port } = server.address()

    try {
      await request(`http://localhost:${port}`)
        .get('/some-route')
        .timeout(20)
    } catch (err) {
      // intentionally blank
    }

    await manualPromise
    expect(errorHandlerCalled).to.equal(false)
  })
})
