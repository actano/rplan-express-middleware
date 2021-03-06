import { Logger } from '@rplan/logger'
import {
  ErrorRequestHandler,
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express'
import { StoppableServer } from 'stoppable'

declare namespace middleware {
  enum HANDLER_LOG_LEVEL {
    TRACE ,
    DEBUG,
    INFO,
  }

  function loggingHandler(logLevel: HANDLER_LOG_LEVEL): RequestHandler

  function detectAbortedRequests(options?: {
    logLevel?: HANDLER_LOG_LEVEL,
  }): RequestHandler

  function isAbortedByClient(req: Request): boolean

  function requestLogger(): RequestHandler

  function getRequestLogger(req: Request): Logger

  function addRequestStatistics(req: Request, key: string, value: number): void

  function requestIdMiddleware(): RequestHandler

  function getRequestId(req: Request): string

  function catchAsyncErrors(fn: (req: Request, res: Response) => Promise<any>): RequestHandler

  class HttpError extends Error {}
  class ClientError extends HttpError {}
  class NotFoundError extends ClientError {}
  class ConflictError extends ClientError {}
  class BadRequestError extends ClientError {}
  class ForbiddenError extends ClientError {}
  class UnauthorizedError extends ClientError {}

  function isClientError(error: Error): boolean

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

  class RequestClosed extends Error {}

  interface RequestContext {
    getRequestId(): string,
    getLogger(): Logger,
    isClosed(): boolean,
  }

  class RequestContextBase implements RequestContext {
    protected req: Request

    constructor(req: Request)

    getRequestId(): string

    getLogger(): Logger

    isClosed(): boolean
  }

  function initializeRequestContext<T extends RequestContext>(createContext: (req: Request, res: Response) => T): {
    getRequestContext(req: Request): T,
    requestContext(req: Request, res: Response, next: NextFunction): void,
    ensureRequestIsRunning(context: T): void
    handleRequestClosedError(err: unknown, req: Request, res: Response, next: NextFunction): void,
  }
}

export = middleware
