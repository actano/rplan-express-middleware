import { expect } from 'chai'
import express from 'express'
import request from 'supertest'

import { detectAbortedRequests, isAbortedByClient } from '../src/detect-aborted-requests'

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

  function runServer(handler) {
    const closeProbe = (req, res, next) => {
      res.on('close', () => {
        closeProbe.abortedByClient = isAbortedByClient(req)
      })
      next()
    }

    const app = express()
    app.use(detectAbortedRequests())
    app.use(closeProbe)
    app.get('/some-route', handler)
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
    it('should set abortedByClient property to false', async () => {
      const closeProbe = runServer(
        delayedHandler(100, { success: true }, 200),
      )
      const { port } = server.address()

      const res = await request(`http://localhost:${port}`).get('/some-route')

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal({ success: true })

      expect(closeProbe.abortedByClient).to.equal(false)
    })
  })

  context('when request is aborted', () => {
    it('should set abortedByClient property to true', async () => {
      const closeProbe = runServer(
        delayedHandler(100, { success: true }, 200),
      )
      const { port } = server.address()

      const req = request(`http://localhost:${port}`)
        .get('/some-route')
        .end()

      await wait(10)
      req.abort()

      await wait(200)

      expect(closeProbe.abortedByClient).to.equal(true)
    })
  })
})
