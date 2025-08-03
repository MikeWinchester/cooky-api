import { NextFunction, Request, Response } from 'express';
import ApiResponse from '../utils/apiResponse';
import logger from '../utils/logger';

class ErrorMiddleware {
  handleError(err: Error, req: Request, res: Response, next: NextFunction) {
    logger.error(`[${req.method}] ${req.path} >> ${err.stack}`);

    if (err.name === 'ValidationError') {
      return ApiResponse.badRequest(res, err.message);
    }

    if (err.name === 'UnauthorizedError') {
      return ApiResponse.unauthorized(res, err.message);
    }

    // Handle more specific errors as needed

    return ApiResponse.error(res, err);
  }

  handleNotFound(req: Request, res: Response, next: NextFunction) {
    const error = new Error(`Not Found - ${req.method} ${req.originalUrl}`);
    logger.warn(`[${req.method}] ${req.path} >> Not Found`);
    return ApiResponse.notFound(res, error.message);
  }
}

export default new ErrorMiddleware();