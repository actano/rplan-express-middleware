export const catchAsyncErrors = fn =>
  async (req, res, next) => {
    try {
      await fn(req, res)
    } catch (err) {
      next(err)
      return
    }

    if (!res || !res.headersSent) {
      next()
    }
  }
