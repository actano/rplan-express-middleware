import { expect } from 'chai'
import express from 'express'
import request from 'supertest'
import uniq from 'lodash/uniq'

import { catchAsyncErrors, requestIdMiddleware } from '../src'
import { getRequestId } from '../src/request-id'

describe('request id middleware', () => {
  let server

  function runServer(handler) {
    const app = express()
    app.use(requestIdMiddleware())
    app.get('/some-route', catchAsyncErrors(handler))
    server = app.listen()
  }

  afterEach(() => {
    if (server) {
      server.close()
    }
  })

  it('should generate a unique request id on each request', async () => {
    const capturedRequestIds = []

    runServer(async (req, res) => {
      capturedRequestIds.push(getRequestId(req))
      res.status(200).json({ foo: true })
    })
    const { port } = server.address()

    for (let i = 0; i < 10; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(`http://localhost:${port}`).get('/some-route')
    }

    expect(capturedRequestIds).to.have.length(10)
    expect(uniq(capturedRequestIds)).to.have.length(10)

    for (let i = 0; i < capturedRequestIds.length; i += 1) {
      expect(capturedRequestIds[i] != null).to.equal(true)
    }
  })

  context('when x-request-id has been set', () => {
    it('should propagate the existing request id', async () => {
      const capturedRequestIds = []

      runServer(async (req, res) => {
        capturedRequestIds.push(getRequestId(req))
        res.status(200).json({ foo: true })
      })
      const { port } = server.address()

      await request(`http://localhost:${port}`)
        .get('/some-route')
        .set('x-request-id', 'my-own-test-request-id')

      expect(capturedRequestIds).to.have.length(1)
      expect(capturedRequestIds[0]).to.equal('my-own-test-request-id')
    })
  })
})
