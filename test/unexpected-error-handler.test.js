import { expect } from 'chai'

import express from 'express'
import request from 'supertest'

import {
  catchAsyncErrors,
  unexpectedErrorHandler,
} from '../src'

describe('unexpected-error-handler', () => {
  let server

  function runServer(middleware) {
    const app = express()
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
})
