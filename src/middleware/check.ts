import { Request, Response, NextFunction } from "express";
import { verify, JwtPayload } from 'jsonwebtoken';

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
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      const err: any = new Error("JWT_SECRET is not configured");
      err.status = 500;
      err.code = "Error_ServerConfig";
      return next(err);
    }
    const decoded = verify(token, secret) as JwtPayload & { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    const err: any = new Error("Token has expired or is invalid");
    err.status = 401;
    err.code = 'Error_TokenExpired';
    return next(err);
  }
};


