import { Logger } from '@rplan/logger'
import { ErrorRequestHandler, Express, Request, RequestHandler, Response } from 'express'
import { StoppableServer } from 'stoppable'

declare namespace middleware {
  enum HANDLER_LOG_LEVEL {
    TRACE ,
    DEBUG,
    INFO,
  }

  function loggingHandler(logLevel: HANDLER_LOG_LEVEL): RequestHandler

  function getRequestLogger(req: Request): Logger

  function requestIdMiddleware(): RequestHandler

  function getRequestId(req: Request): string

  function catchAsyncErrors(fn: (req: Request, res: Response) => Promise<any>): RequestHandler

  class NotFoundError extends Error {}
  class ConflictError extends Error {}
  class BadRequestError extends Error {}
  class ForbiddenError extends Error {}
  class UnauthorizedError extends Error {}

  const expectedErrorHandler: ErrorRequestHandler

  function registerError<E extends Error>(errorClass: new () => E, httpStatusCode: number): void

  const unexpectedErrorHandler: ErrorRequestHandler

  function requestMetrics(
    options?: {
      pathPatterns?: string[],
      ignoredPaths?: string[],
      durationBuckets?: number[],
    },
  ): RequestHandler

  function startServer(
    expressApp: Express,
    port: number,
    keepAliveGracePeriod: number,
    onStart?: () => void | Promise<void>,
  ): Promise<StoppableServer>

  function shutdownServer(
    server: StoppableServer,
    onShutdown?: () => void | Promise<void>,
  ): void

  function handleServerLifecycle(
    expressApp: Express,
    port: number,
    options?: {
      keepAliveGracePeriod?: number,
      waitForKubernetesPeriod?: number,
      onStart?: () => void | Promise<void>,
      onShutdown?: () => void | Promise<void>,
    },
  ): () => Promise<void>
}

export = middleware
