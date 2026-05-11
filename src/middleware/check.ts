import { Request, Response, NextFunction } from "express";
import { verify } from 'jsonwebtoken';

export interface CustomRequest extends Request {
  userId?: number;
}

export const check = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    const err: any = new Error("Authentication required");
    err.status = 401;
    err.code = 'Error_AuthRequired';
    return next(err);
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    const err: any = new Error("Token has expired or is invalid");
    err.status = 401;
    err.code = 'Error_TokenExpired';
    return next(err);
  }
};


