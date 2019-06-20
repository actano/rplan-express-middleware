import express from 'express'
import request from 'supertest'
import { expect } from 'chai'

import { requestMetricsFactory } from '../src/request-metrics'

describe('requestMetrics middleware', () => {
  let requestCountCalls
  let requestDurationCalls
  let requestMetrics
  let server

  function runServer(middleware) {
    const app = express()

    app.use(middleware)

    app.get('/foo', (req, res) => {
      const { statusCode } = req.query
      res.sendStatus(statusCode)
    })

    app.post('/foo', (req, res) => {
      const { statusCode } = req.query
      res.sendStatus(statusCode)
    })

    app.get('/bar/:id', (req, res) => {
      const { statusCode } = req.query
      res.sendStatus(statusCode)
    })

    app.post('/bar/:id/test', (req, res) => {
      const { statusCode } = req.query
      res.sendStatus(statusCode)
    })

    server = app.listen()
  }

  afterEach(() => {
    if (server) {
      server.close()
    }
  })

  beforeEach(() => {
    requestCountCalls = []
    const getRequestCount = () => ({
      inc(arg) {
        return requestCountCalls.push(arg)
      },
    })

    requestDurationCalls = []
    const getRequestDuration = () => ({
      labels(...labels) {
        return {
          observe(value) {
            requestDurationCalls.push({ labels, valueIsNumber: typeof value === 'number' })
          },
        }
      },
    })

    requestMetrics = requestMetricsFactory(getRequestCount, getRequestDuration)
  })

  describe('request counts', () => {
    it('should count requests per method, path and status code', async () => {
      const requestMetricsMiddleware = requestMetrics()

      runServer(requestMetricsMiddleware)
      const { port } = server.address()

      await request(`http://localhost:${port}`).get('/foo?statusCode=200')
      await request(`http://localhost:${port}`).get('/foo?statusCode=201')
      await request(`http://localhost:${port}`).post('/foo?statusCode=500')
      await request(`http://localhost:${port}`).post('/foo?statusCode=201')
      await request(`http://localhost:${port}`).get('/foo?statusCode=404')
      await request(`http://localhost:${port}`).post('/foo?statusCode=503')
      await request(`http://localhost:${port}`).get('/foo?statusCode=401')
      await request(`http://localhost:${port}`).post('/foo?statusCode=200')
      await request(`http://localhost:${port}`).get('/foo?statusCode=403')
      await request(`http://localhost:${port}`).post('/foo?statusCode=404')
      await request(`http://localhost:${port}`).get('/foo?statusCode=500')
      await request(`http://localhost:${port}`).get('/bar/abc?statusCode=404')
      await request(`http://localhost:${port}`).post('/bar/xyz/test?statusCode=200')

      expect(requestCountCalls).to.deep.have.members([
        { method: 'GET', path: '/foo', status: '2xx' },
        { method: 'GET', path: '/foo', status: '2xx' },
        { method: 'POST', path: '/foo', status: '5xx' },
        { method: 'POST', path: '/foo', status: '2xx' },
        { method: 'GET', path: '/foo', status: '4xx' },
        { method: 'POST', path: '/foo', status: '5xx' },
        { method: 'GET', path: '/foo', status: '4xx' },
        { method: 'POST', path: '/foo', status: '2xx' },
        { method: 'GET', path: '/foo', status: '4xx' },
        { method: 'POST', path: '/foo', status: '4xx' },
        { method: 'GET', path: '/foo', status: '5xx' },
        { method: 'GET', path: '/bar/abc', status: '4xx' },
        { method: 'POST', path: '/bar/xyz/test', status: '2xx' },
      ])
    })

    it('should match the given path patterns', async () => {
      const requestMetricsMiddleware = requestMetrics(
        {
          pathPatterns: [
            '/bar/:id',
            '/bar/:id/test',
          ],
        },
      )

      runServer(requestMetricsMiddleware)
      const { port } = server.address()

      await request(`http://localhost:${port}`).get('/bar/abc?statusCode=404')
      await request(`http://localhost:${port}`).post('/bar/xyz/test?statusCode=200')

      expect(requestCountCalls).to.deep.have.members([
        { method: 'GET', path: '/bar/:id', status: '4xx' },
        { method: 'POST', path: '/bar/:id/test', status: '2xx' },
      ])
    })

    it('should ignore the given paths', async () => {
      const requestMetricsMiddleware = requestMetrics(
        {
          pathPatterns: ['/bar/:id', '/bar/:id/test'],
          ignoredPaths: ['/foo', '/bar/:id'],
        },
      )

      runServer(requestMetricsMiddleware)
      const { port } = server.address()

      await request(`http://localhost:${port}`).get('/foo?statusCode=500')
      await request(`http://localhost:${port}`).get('/bar/abc?statusCode=404')
      await request(`http://localhost:${port}`).post('/bar/abc/test?statusCode=304')

      expect(requestCountCalls).to.deep.have.members([
        { method: 'POST', path: '/bar/:id/test', status: '3xx' },
      ])
    })
  })

  describe('response time histogram', () => {
    it('should observe response times per method, path and status code', async () => {
      const requestMetricsMiddleware = requestMetrics()

      runServer(requestMetricsMiddleware)
      const { port } = server.address()

      await request(`http://localhost:${port}`).get('/foo?statusCode=200')
      await request(`http://localhost:${port}`).get('/foo?statusCode=201')
      await request(`http://localhost:${port}`).post('/foo?statusCode=500')
      await request(`http://localhost:${port}`).post('/foo?statusCode=201')
      await request(`http://localhost:${port}`).get('/foo?statusCode=404')
      await request(`http://localhost:${port}`).post('/foo?statusCode=503')
      await request(`http://localhost:${port}`).get('/foo?statusCode=401')
      await request(`http://localhost:${port}`).post('/foo?statusCode=200')
      await request(`http://localhost:${port}`).get('/foo?statusCode=403')
      await request(`http://localhost:${port}`).post('/foo?statusCode=404')
      await request(`http://localhost:${port}`).get('/foo?statusCode=500')
      await request(`http://localhost:${port}`).get('/bar/abc?statusCode=404')
      await request(`http://localhost:${port}`).post('/bar/xyz/test?statusCode=200')

      expect(requestDurationCalls).to.deep.have.members([
        { labels: ['GET', '/foo', '2xx'], valueIsNumber: true },
        { labels: ['GET', '/foo', '2xx'], valueIsNumber: true },
        { labels: ['POST', '/foo', '5xx'], valueIsNumber: true },
        { labels: ['POST', '/foo', '2xx'], valueIsNumber: true },
        { labels: ['GET', '/foo', '4xx'], valueIsNumber: true },
        { labels: ['POST', '/foo', '5xx'], valueIsNumber: true },
        { labels: ['GET', '/foo', '4xx'], valueIsNumber: true },
        { labels: ['POST', '/foo', '2xx'], valueIsNumber: true },
        { labels: ['GET', '/foo', '4xx'], valueIsNumber: true },
        { labels: ['POST', '/foo', '4xx'], valueIsNumber: true },
        { labels: ['GET', '/foo', '5xx'], valueIsNumber: true },
        { labels: ['GET', '/bar/abc', '4xx'], valueIsNumber: true },
        { labels: ['POST', '/bar/xyz/test', '2xx'], valueIsNumber: true },
      ])
    })

    it('should match the given path patterns', async () => {
      const requestMetricsMiddleware = requestMetrics(
        {
          pathPatterns: [
            '/bar/:id',
            '/bar/:id/test',
          ],
        },
      )

      runServer(requestMetricsMiddleware)
      const { port } = server.address()

      await request(`http://localhost:${port}`).get('/bar/abc?statusCode=404')
      await request(`http://localhost:${port}`).post('/bar/xyz/test?statusCode=200')

      expect(requestDurationCalls).to.deep.have.members([
        { labels: ['GET', '/bar/:id', '4xx'], valueIsNumber: true },
        { labels: ['POST', '/bar/:id/test', '2xx'], valueIsNumber: true },
      ])
    })

    it('should ignore the given paths', async () => {
      const requestMetricsMiddleware = requestMetrics(
        {
          pathPatterns: ['/bar/:id', '/bar/:id/test'],
          ignoredPaths: ['/foo', '/bar/:id'],
        },
      )

      runServer(requestMetricsMiddleware)
      const { port } = server.address()

      await request(`http://localhost:${port}`).get('/foo?statusCode=500')
      await request(`http://localhost:${port}`).get('/bar/abc?statusCode=404')
      await request(`http://localhost:${port}`).post('/bar/abc/test?statusCode=304')

      expect(requestDurationCalls).to.deep.have.members([
        { labels: ['POST', '/bar/:id/test', '3xx'], valueIsNumber: true },
      ])
    })
  })
})
