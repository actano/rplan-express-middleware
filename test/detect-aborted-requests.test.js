import { expect } from 'chai'
import express from 'express'
import request from 'supertest'

import { requestLogger } from '../src'
import { detectAbortedRequests } from '../src/detect-aborted-requests'
import { loggingHandler } from '../src/logging-handler'
import { unexpectedErrorHandler } from '../src/unexpected-error-handler'

const delayedHandler = (delay, responseBody, responseStatus) => (req, res, next) => {
  setTimeout(
    () => {
      try {
        res
          .status(responseStatus)
          .send(responseBody)
      } catch (err) {
        next(err)
      }
    },
    delay,
  )
}

const wait = delay => new Promise((resolve) => {
  setTimeout(() => { resolve() }, delay)
})

describe('detecting aborted requests', () => {
  let server

  function runServer(options, handler) {
    const closeProbe = (req, res, next) => {
      res.on('close', () => {
        closeProbe.statusCode = res.statusCode
        closeProbe.requestEnded = res.headersSent
      })
      next()
    }

    const app = express()
    app.use(requestLogger())
    app.use(detectAbortedRequests(options))
    app.use(closeProbe)
    app.use(loggingHandler())
    app.get('/some-route', handler)
    app.use(unexpectedErrorHandler)
    server = app.listen()

    return closeProbe
  }

  afterEach(() => {
    if (server != null) {
      server.close()
      server = null
    }
  })

  context('when request is not aborted', () => {
    it('should respond with status from handler', async () => {
      const closeProbe = runServer(
        { statusCodeOnAbort: 500 },
        delayedHandler(100, { success: true }, 200),
      )
      const { port } = server.address()

      const res = await request(`http://localhost:${port}`).get('/some-route')

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal({ success: true })

      expect(closeProbe.statusCode).to.equal(200)
      expect(closeProbe.requestEnded).to.equal(true)
    })
  })

  context('when request is aborted', () => {
    it('should internally set configured status code and end the request', async () => {
      const closeProbe = runServer(
        { statusCodeOnAbort: 500 },
        delayedHandler(100, { success: true }, 200),
      )
      const { port } = server.address()

      const req = request(`http://localhost:${port}`)
        .get('/some-route')
        .end()

      await wait(10)
      req.abort()

      await wait(200)

      expect(closeProbe.statusCode).to.equal(500)
      expect(closeProbe.requestEnded).to.equal(true)
    })
  })
})
