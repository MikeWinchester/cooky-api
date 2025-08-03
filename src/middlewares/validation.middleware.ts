import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utils/apiResponse';
import { validate } from '../utils/validator';

function validationMiddleware(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = validate(req.body, schema);
    
    if (error) {
      return ApiResponse.badRequest(res, error.details[0].message);
    }
    
    req.body = value;
    next();
  };
}

export default validationMiddleware;