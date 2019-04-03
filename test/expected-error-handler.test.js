import { expect } from 'chai'

import express from 'express'
import request from 'supertest'

import {
  BadRequestError,
  catchAsyncErrors,
  ConflictError,
  expectedErrorHandler, ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../src'

describe('expected-error-handler', () => {
  let server

  function runServer(middleware) {
    const app = express()
    app.get('/some-route', catchAsyncErrors(middleware))
    app.use(expectedErrorHandler)
    server = app.listen()
  }

  afterEach(() => {
    if (server) {
      server.close()
    }
  })

  describe('standard errors', () => {
    it('should send 404 on NotFoundError', async () => {
      runServer(async () => {
        throw new NotFoundError('not found')
      })
      const { port } = server.address()
      const response = await request(`http://localhost:${port}`).get('/some-route')
      expect(response.status).to.equal(404)
      expect(response.body).to.deep.equal({
        message: 'not found',
      })
    })

    it('should send 400 on BadRequestError', async () => {
      runServer(async () => {
        throw new BadRequestError('very bad')
      })
      const { port } = server.address()
      const response = await request(`http://localhost:${port}`).get('/some-route')
      expect(response.status).to.equal(400)
      expect(response.body).to.deep.equal({
        message: 'very bad',
      })
    })

    it('should send 409 on ConflictError', async () => {
      runServer(async () => {
        throw new ConflictError('conflicts')
      })
      const { port } = server.address()
      const response = await request(`http://localhost:${port}`).get('/some-route')
      expect(response.status).to.equal(409)
      expect(response.body).to.deep.equal({
        message: 'conflicts',
      })
    })

    it('should send 403 on ForbiddenError', async () => {
      runServer(async () => {
        throw new ForbiddenError('you not')
      })
      const { port } = server.address()
      const response = await request(`http://localhost:${port}`).get('/some-route')
      expect(response.status).to.equal(403)
      expect(response.body).to.deep.equal({
        message: 'you not',
      })
    })

    it('should send 401 on UnauthorizedError', async () => {
      runServer(async () => {
        throw new UnauthorizedError('out here')
      })
      const { port } = server.address()
      const response = await request(`http://localhost:${port}`).get('/some-route')
      expect(response.status).to.equal(401)
      expect(response.body).to.deep.equal({
        message: 'out here',
      })
    })
  })
})
