import chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'

import { catchAsyncErrors } from '../src/catch-async-errors'

chai.use(sinonChai)
const { expect } = chai

describe('catch-async-errors', () => {
  it('should catch an error', async () => {
    const requestStub = sinon.stub()
    const responseStub = sinon.stub()
    const nextStub = sinon.stub()

    const catchAsyncErrorsHandler = catchAsyncErrors(async () => {
      throw new Error('foo')
    })

    await catchAsyncErrorsHandler(requestStub, responseStub, nextStub)

    expect(nextStub).to.have.callCount(1)

    const nextArg = nextStub.getCall(0).args[0]
    expect(nextArg).to.be.instanceOf(Error)
    expect(nextArg.message).to.be.equal('foo')
  })

  it('should call next without args on no error', async () => {
    const requestStub = sinon.stub()
    const responseStub = sinon.stub()
    const nextStub = sinon.stub()

    const catchAsyncErrorsHandler = catchAsyncErrors(async () => {
      // do nothing
    })

    await catchAsyncErrorsHandler(requestStub, responseStub, nextStub)

    expect(nextStub).to.have.callCount(1)

    const nextArg = nextStub.getCall(0).args[0]
    expect(nextArg).to.equal(undefined)
  })
})
