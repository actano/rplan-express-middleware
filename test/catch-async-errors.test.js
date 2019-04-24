import chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import express from 'express'
import * as HttpStatus from 'http-status-codes'
import request from 'supertest'

import { catchAsyncErrors } from '../src/catch-async-errors'

chai.use(sinonChai)
const { expect } = chai

const successMiddleware = (req, res) => {
  res
    .status(HttpStatus.OK)
    .send({ source: 'successMiddleware' })
}

// eslint-disable-next-line no-unused-vars
const errorHandlingMiddleware = (err, req, res, next) => {
  if (err) {
    res
      .status(HttpStatus.OK)
      .send({ source: 'errorHandlingMiddleware' })
  } else {
    res.sendStatus(HttpStatus.NOT_IMPLEMENTED)
  }
}

describe('catch-async-errors', () => {
  let server
  let successMiddlewareSpy
  let errorHandlingMiddlewareSpy

  function runServer(middleware) {
    successMiddlewareSpy = sinon.spy(successMiddleware)
    errorHandlingMiddlewareSpy = sinon.spy(errorHandlingMiddleware)

    const app = express()
    app.get('/some-route', catchAsyncErrors(middleware))
    app.use(successMiddlewareSpy)
    app.use(errorHandlingMiddlewareSpy)
    server = app.listen()
  }

  afterEach(() => {
    if (server) {
      server.close()
      server = null
    }
  })

  context('when handler function throws an error', () => {
    it('should catch the error and call the error handling middleware', async () => {
      runServer(async () => {
        throw new Error()
      })

      const { port } = server.address()
      const { body } = await request(`http://localhost:${port}`)
        .get('/some-route')
        .expect(HttpStatus.OK)

      expect(body.source).to.equal('errorHandlingMiddleware')
      expect(successMiddlewareSpy.callCount, 'successMiddleware call count')
        .to.equal(0)
      expect(errorHandlingMiddlewareSpy.callCount, 'errorHandlingMiddleware call count')
        .to.equal(1)
    })
  })

  context('when handler function does not throw an error', () => {
    context('when handler function sends a response', () => {
      it('should not call any other middlewares', async () => {
        runServer(async (req, res) => {
          res
            .status(HttpStatus.OK)
            .send({ source: 'handlerFunction' })
        })

        const { port } = server.address()
        const { body } = await request(`http://localhost:${port}`)
          .get('/some-route')
          .expect(HttpStatus.OK)

        expect(body.source).to.equal('handlerFunction')
        expect(successMiddlewareSpy.callCount, 'successMiddleware call count')
          .to.equal(0)
        expect(errorHandlingMiddlewareSpy.callCount, 'errorHandlingMiddleware call count')
          .to.equal(0)
      })
    })

    context('when handler function does not send a response', () => {
      it('should call the next non error handling middleware', async () => {
        runServer(async () => {
          // do nothing
        })

        const { port } = server.address()
        const { body } = await request(`http://localhost:${port}`)
          .get('/some-route')
          .expect(HttpStatus.OK)

        expect(body.source).to.equal('successMiddleware')
        expect(successMiddlewareSpy.callCount, 'successMiddleware call count')
          .to.equal(1)
        expect(errorHandlingMiddlewareSpy.callCount, 'errorHandlingMiddleware call count')
          .to.equal(0)
      })
    })
  })
})
