const HANDLER_LOG_LEVEL = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
}

const bindLogger = (logger, logLevel) => {
  switch (logLevel) {
    case HANDLER_LOG_LEVEL.TRACE:
      return logger.trace.bind(logger)
    case HANDLER_LOG_LEVEL.DEBUG:
      return logger.debug.bind(logger)
    case HANDLER_LOG_LEVEL.INFO:
      return logger.info.bind(logger)
    default:
      return logger.debug.bind(logger)
  }
}

export {
  HANDLER_LOG_LEVEL,
  bindLogger,
}
