import { expect } from 'chai'

import express from 'express'
import request from 'supertest'

import {
  catchAsyncErrors,
  loggingHandler,
} from '../src'

describe('logging-handler', () => {
  let server

  function runServer(middleware) {
    const app = express()
    app.use(loggingHandler)
    app.get('/some-route', catchAsyncErrors(middleware))
    server = app.listen()
  }

  afterEach(() => {
    if (server) {
      server.close()
    }
  })

  it('should not block requests', async () => {
    runServer(async (req, res) => {
      res.status(200).json({ foo: true })
    })

    const { port } = server.address()
    const response = await request(`http://localhost:${port}`).get('/some-route')
    expect(response.status).to.equal(200)
    expect(response.body).to.deep.equal({ foo: true })
  })
})
