// eslint-disable-next-line import/no-extraneous-dependencies
import Prometheus from 'prom-client'
import gcStats from 'prometheus-gc-stats'
import { pathToRegexp } from 'path-to-regexp'
import url from 'url'

const startGcStats = gcStats(Prometheus.register)

let _requestCount
const getRequestCount = () => {
  if (!_requestCount) {
    _requestCount = new Prometheus.Counter({
      name: 'http_requests_total',
      help: 'count all requests',
      labelNames: ['method', 'path', 'status'],
    })
  }

  return _requestCount
}

let _requestDuration
const getRequestDuration = (buckets) => {
  if (!_requestDuration) {
    _requestDuration = new Prometheus.Histogram({
      name: 'http_request_duration_ms',
      help: 'duration of requests in milliseconds',
      labelNames: ['method', 'path', 'status'],
      buckets,
    })
  }

  return _requestDuration
}

const getPathFromUri = uri =>
  url.parse(uri).pathname

function normalizePath(pathMatchers, uri) {
  const path = getPathFromUri(uri)

  for (const { pattern, matcher } of pathMatchers) {
    if (matcher.test(path)) {
      return pattern
    }
  }

  return path
}

function normalizeStatus(statusCode) {
  if (statusCode >= 200 && statusCode < 300) {
    return '2xx'
  }

  if (statusCode >= 300 && statusCode < 400) {
    return '3xx'
  }

  if (statusCode >= 400 && statusCode < 500) {
    return '4xx'
  }

  return '5xx'
}

export const requestMetricsFactory = (_getRequestCount, _getRequestDuration) => (options = {}) => {
  startGcStats()
  const requestCount = _getRequestCount()

  const pathPatterns = options.pathPatterns || []
  const ignoredPaths = options.ignoredPaths || []
  const durationBuckets = options.durationBuckets || [10, 100, 1000, 2000]

  const pathMatchers = pathPatterns.map(pattern => ({
    pattern,
    matcher: pathToRegexp(pattern),
  }))

  const ignoredPathLookup = ignoredPaths.reduce(
    (acc, path) => ({ ...acc, [path]: true }),
    {},
  )

  const requestDuration = _getRequestDuration(durationBuckets)

  return (req, res, next) => {
    const { originalUrl, method } = req
    const path = normalizePath(pathMatchers, originalUrl)

    if (ignoredPathLookup[path]) {
      next()
      return
    }

    const startTime = process.hrtime()
    let counted = false

    function doCount() {
      if (counted) {
        return
      }

      counted = true
      const timeDelta = process.hrtime(startTime)
      const duration = (timeDelta[0] * 1e3) + timeDelta[1] / 1e6

      const status = normalizeStatus(res.statusCode)

      requestCount.inc({ method, path, status })
      requestDuration.labels(method, path, status).observe(duration)
    }

    res.once('finish', doCount)
    res.once('close', doCount)

    next()
  }
}

export const requestMetrics = requestMetricsFactory(getRequestCount, getRequestDuration)
