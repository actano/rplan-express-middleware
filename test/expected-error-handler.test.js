import { expect } from 'chai'

import express from 'express'
import request from 'supertest'

import {
  BadRequestError,
  catchAsyncErrors,
  ConflictError,
  expectedErrorHandler,
  ForbiddenError,
  NotFoundError,
  registerError,
  UnauthorizedError,
} from '../src'

describe('expected-error-handler', () => {
  let server
  let app

  function runServer(middleware) {
    app = express()
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
        name: 'NotFoundError',
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
        name: 'BadRequestError',
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
        name: 'ConflictError',
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
        name: 'ForbiddenError',
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
        name: 'UnauthorizedError',
        message: 'out here',
      })
    })
  })

  describe('custom errors', () => {
    it('should send custom http code on CustomError', async () => {
      class CustomError extends Error {}
      CustomError.prototype.name = CustomError.name
      registerError(CustomError, 442)

      runServer(async () => {
        throw new CustomError('custom error')
      })

      const { port } = server.address()
      const response = await request(`http://localhost:${port}`).get('/some-route')
      expect(response.status).to.equal(442)
      expect(response.body).to.deep.equal({
        name: 'CustomError',
        message: 'custom error',
      })
    })
  })

  describe('misconfiguration', () => {
    it('should not register the same error twice', async () => {
      class AnotherCustomError extends Error {}
      AnotherCustomError.prototype.name = AnotherCustomError.name
      registerError(AnotherCustomError, 442)
      expect(() => {
        registerError(AnotherCustomError, 400)
      }).to.throw(Error)
    })
  })

  describe('when response was already sent', () => {
    it('should propagate error to next middleware', async () => {
      const error = new Error()
      let errorInNextMiddleware = null

      // eslint-disable-next-line no-unused-vars
      const nextMiddleware = (err, req, res, next) => {
        errorInNextMiddleware = err
      }

      runServer(async (req, res) => {
        res.sendStatus(200)
        throw error
      })

      app.use(nextMiddleware)

      const { port } = server.address()
      const response = await request(`http://localhost:${port}`).get('/some-route')
      expect(response.status).to.equal(200)

      expect(errorInNextMiddleware).to.equal(error)
    })
  })

  describe('on unexpected error', () => {
    it('should propagate error to next middleware', async () => {
      const error = new Error()
      let errorInNextMiddleware = null

      // eslint-disable-next-line no-unused-vars
      const nextMiddleware = (err, req, res, next) => {
        errorInNextMiddleware = err
        res.sendStatus(200)
      }

      runServer(async () => {
        throw error
      })

      app.use(nextMiddleware)

      const { port } = server.address()
      const response = await request(`http://localhost:${port}`).get('/some-route')
      expect(response.status).to.equal(200)

      expect(errorInNextMiddleware).to.equal(error)
    })
  })

  describe('when error is handled', () => {
    it('should not call next middleware', async () => {
      let nextMiddlewareCalled = false

      // eslint-disable-next-line no-unused-vars
      const nextMiddleware = (req, res, next) => {
        nextMiddlewareCalled = true
      }

      runServer(async () => {
        throw new NotFoundError()
      })

      app.use(nextMiddleware)

      const { port } = server.address()
      await request(`http://localhost:${port}`).get('/some-route')

      expect(nextMiddlewareCalled).to.equal(false)
    })
  })
})
