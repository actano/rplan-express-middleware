import createLogger from '@rplan/logger'
import stoppable from 'stoppable'

const logger = createLogger('express-lifecycle')

const noop = () => {}

function startServer(expressApp, port, keepAliveGracePeriod, onStart = noop) {
  return stoppable(expressApp.listen(port, onStart), keepAliveGracePeriod)
}

function shutdownServer(server, onShutdown = noop) {
  logger.info('shutting down server')
  server.stop((err, gracefully) => {
    logger.info({ gracefully }, 'server was shut down')
    onShutdown()
  })
}

const defaultOptions = {
  keepAliveGracePeriod: 3000,
  waitForKubernetesPeriod: 3000,
  onStart: noop,
  onShutdown: noop,
}

function handleServerLifecycle(expressApp, port, options) {
  const effectiveOptions = {
    ...defaultOptions,
    ...options,
  }

  const {
    keepAliveGracePeriod,
    waitForKubernetesPeriod,
    onStart,
    onShutdown,
  } = effectiveOptions

  const server = startServer(expressApp, port, keepAliveGracePeriod, onStart)
  const shutdown = () => {
    shutdownServer(server, onShutdown)
  }

  process.on('SIGINT', () => {
    shutdown()
  })

  process.on('SIGTERM', () => {
    // kubernetes needs some time to update proxies. In this time request
    // would still be proxied to this instance and be responded with 503.
    // 3s should be sufficient but could still be cause 503 errors in some cases
    logger.info(`SIGTERM received. Waiting for ${waitForKubernetesPeriod}ms to allow Kubernetes to modify the service proxy`)
    setTimeout(shutdown, waitForKubernetesPeriod)
  })

  return shutdown
}

export {
  startServer,
  shutdownServer,
  handleServerLifecycle,
}
