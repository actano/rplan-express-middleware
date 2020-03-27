import { expect } from 'chai'
import express from 'express'
import request from 'supertest'

import { CaptureStdout } from './helper/capture-stdout'

import {
  catchAsyncErrors, getRequestLogger, HANDLER_LOG_LEVEL,
  loggingHandler, requestIdMiddleware,
} from '../src'

describe('logging-handler', () => {
  let server

  function runServer(logLevel, handler) {
    const app = express()
    app.use(loggingHandler(logLevel))
    app.get('/some-route', catchAsyncErrors(handler))
    server = app.listen()
  }

  afterEach(() => {
    if (server) {
      server.close()
    }
  })

  it('should not block requests', async () => {
    runServer(HANDLER_LOG_LEVEL.DEBUG, async (req, res) => {
      res.status(200).json({ foo: true })
    })
    const { port } = server.address()

    const response = await request(`http://localhost:${port}`).get('/some-route')
    expect(response.status).to.equal(200)
    expect(response.body).to.deep.equal({ foo: true })
  })

  // the following tests require @rplan/logger configured with LOG_LEVEL=debug
  it('should log start and finish request', async () => {
    runServer(HANDLER_LOG_LEVEL.DEBUG, async (req, res) => {
      res.status(200).json({ foo: true })
    })
    const { port } = server.address()

    const captureStdout = new CaptureStdout()
    captureStdout.startCapture()

    await request(`http://localhost:${port}`).get('/some-route')

    captureStdout.stopCapture()
    const json = captureStdout.getCapturedText().map(JSON.parse)

    expect(json).to.have.length(2)

    expect(json[0]).to.have.property('msg', 'req started: GET /some-route')

    expect(json[1]).to.have.property('msg', 'req finished: GET /some-route')
    expect(json[1].request).to.have.property('method', 'GET')
    expect(json[1].request).to.have.property('originalUrl', '/some-route')
    expect(json[1].request).to.have.property('url', '/some-route')
    expect(json[1].request).to.have.property('headers')

    expect(json[1].response).to.deep.equal({ statusCode: 200 })

    expect(json[1].statistics).to.have.property('duration')
  })

  it('should use the configured log level', async () => {
    runServer(HANDLER_LOG_LEVEL.INFO, async (req, res) => {
      res.status(200).json({ foo: true })
    })
    const { port } = server.address()

    const captureStdout = new CaptureStdout()
    captureStdout.startCapture()

    await request(`http://localhost:${port}`).get('/some-route')

    captureStdout.stopCapture()
    const json = captureStdout.getCapturedText().map(JSON.parse)

    expect(json).to.have.length(2)

    expect(json[0]).to.have.property('level', 30)
    expect(json[1]).to.have.property('level', 30)
  })

  it('should create a child logger on the request object', async () => {
    runServer(HANDLER_LOG_LEVEL.INFO, async (req, res) => {
      const childLogger = getRequestLogger(req)
      childLogger.info({ isChild: true }, 'log from child logger')
      res.status(200).json({ foo: true })
    })
    const { port } = server.address()

    const captureStdout = new CaptureStdout()
    captureStdout.startCapture()

    await request(`http://localhost:${port}`).get('/some-route')

    captureStdout.stopCapture()
    const json = captureStdout.getCapturedText().map(JSON.parse)

    expect(json).to.have.length(3)

    expect(json[1]).to.have.property('msg', 'log from child logger')
    expect(json[1]).to.have.property('isChild', true)
  })

  context('when request id middleware is used', () => {
    it('should log the request id', async () => {
      const app = express()
      app.use(requestIdMiddleware())
      app.use(loggingHandler(HANDLER_LOG_LEVEL.DEBUG))
      app.get('/some-route', catchAsyncErrors(async (req, res) => {
        res.status(200).json({ foo: true })
      }))
      server = app.listen()

      const { port } = server.address()

      const captureStdout = new CaptureStdout()
      captureStdout.startCapture()

      await request(`http://localhost:${port}`)
        .get('/some-route')
        .set('x-request-id', 'my-test-request-id')

      captureStdout.stopCapture()
      const json = captureStdout.getCapturedText().map(JSON.parse)

      expect(json).to.have.length(2)

      expect(json[0]).to.have.property('requestId', 'my-test-request-id')
      expect(json[1]).to.have.property('requestId', 'my-test-request-id')
    })
  })
})
