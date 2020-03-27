import os from 'os'

function getPrefix() {
  const hostname = os.hostname()

  let b64 = ''

  while (b64.length < 10) {
    const buf = Buffer.alloc(12)

    for (let i = 0; i < 12; i += 1) {
      // eslint-disable-next-line no-bitwise
      buf[i] = (Math.random() * 0xFF) & 0xFF
    }
    b64 += buf.toString('base64').replace(/[/+]/g, '')
  }

  return `${hostname}/${b64}`
}

const REQUEST_ID_PROPERTY = Symbol('request_id_property')
const MAX_ID = 999999999

const getRequestId = req => req[REQUEST_ID_PROPERTY]

function requestIdMiddleware() {
  const prefix = getPrefix()
  let idCounter = 1

  const nextId = () => {
    const result = idCounter

    idCounter += 1

    if (idCounter > MAX_ID) {
      idCounter = 1
    }

    return result
  }

  return (req, res, next) => {
    let requestId = req.header('x-request-id')

    if (requestId == null) {
      requestId = `${prefix}-${nextId()}`
    }

    req[REQUEST_ID_PROPERTY] = requestId

    next()
  }
}

export {
  requestIdMiddleware,
  getRequestId,
  REQUEST_ID_PROPERTY,
}
