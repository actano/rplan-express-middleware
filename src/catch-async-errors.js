export const catchAsyncErrors = fn =>
  async (req, res, next) => {
    try {
      await fn(req, res, next)
      next()
    } catch (err) {
      next(err)
    }
  }
