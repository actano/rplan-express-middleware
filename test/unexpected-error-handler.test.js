import { expect } from 'chai'

import express from 'express'
import request from 'supertest'

import {
  catchAsyncErrors,
  unexpectedErrorHandler,
} from '../src'

describe('unexpected-error-handler', () => {
  let server
  let app

  function runServer(middleware) {
    app = express()
    app.get('/some-route', catchAsyncErrors(middleware))
    app.use(unexpectedErrorHandler)
    server = app.listen()
  }

  afterEach(() => {
    if (server) {
      server.close()
    }
  })

  it('should send 500 http code on unexpected error', async () => {
    runServer(async () => {
      throw new Error('server error')
    })

    const { port } = server.address()
    const response = await request(`http://localhost:${port}`).get('/some-route')
    expect(response.status).to.equal(500)
    expect(response.body).to.deep.equal({ })
    expect(response.text).to.equal('Internal Server Error')
  })

  it('should respond with err.status for unexpected errors', async () => {
    runServer(async () => {
      const err = new Error('server error')
      // this would be handled by express by default
      err.status = 400
      throw err
    })

    const { port } = server.address()
    const response = await request(`http://localhost:${port}`).get('/some-route')
    expect(response.status).to.equal(400)
  })

  it('should not call next middleware', async () => {
    let nextMiddlewareCalled = false

    // eslint-disable-next-line no-unused-vars
    const nextMiddleware = (req, res, next) => {
      nextMiddlewareCalled = true
    }

    runServer(async () => {
      throw new Error()
    })

    app.use(nextMiddleware)

    const { port } = server.address()
    await request(`http://localhost:${port}`).get('/some-route')

    expect(nextMiddlewareCalled).to.equal(false)
  })

  context('when response was already sent', () => {
    // logging cannot be tested currently
    it('should not call next middleware and log the error', async () => {
      let nextMiddlewareCalled = false

      // eslint-disable-next-line no-unused-vars
      const nextMiddleware = (req, res, next) => {
        nextMiddlewareCalled = true
      }

      runServer(async (req, res) => {
        res.sendStatus(200)
        throw new Error()
      })

      app.use(nextMiddleware)

      const { port } = server.address()
      await request(`http://localhost:${port}`).get('/some-route')

      expect(nextMiddlewareCalled).to.equal(false)
    })
  })
})
