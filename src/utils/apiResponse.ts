import { Response } from 'express';

export default class ApiResponse {
  static success(res: Response, data: any, status = 200) {
    return res.status(status).json({
      success: true,
      data
    });
  }

  static error(res: Response, error: any, status = 500) {
    return res.status(status).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }

  static badRequest(res: Response, message: string) {
    return res.status(400).json({
      success: false,
      message
    });
  }

  static unauthorized(res: Response, message = 'Unauthorized') {
    return res.status(401).json({
      success: false,
      message
    });
  }

  static forbidden(res: Response, message = 'Forbidden') {
    return res.status(403).json({
      success: false,
      message
    });
  }

  static notFound(res: Response, message = 'Not Found') {
    return res.status(404).json({
      success: false,
      message
    });
  }

  static conflict(res: Response, message = 'Conflict') {
    return res.status(409).json({
      success: false,
      message
    });
  }

  static unprocessableEntity(res: Response, message = 'Unprocessable Entity') {
    return res.status(422).json({
      success: false,
      message
    });
  }

  static internalServerError(res: Response, message = 'Internal Server Error') {
    return res.status(500).json({
      success: false,
      message
    });
  }
}