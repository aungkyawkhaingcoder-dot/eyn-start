import { NextFunction, Request, Response } from "express";
import { CustomError } from "../utils/commonType";
import jwt from "jsonwebtoken";

interface CustomRequest extends Request{
    userId?: number | string;
}
 
export const authMiddleware = (req: CustomRequest, res: Response, next: NextFunction) => {
    const accessToken = req.cookies ? req.cookies.accessToken : null;
    const refreshToken = req.cookies ? req.cookies.refreshToken : null;


    if (!refreshToken) {
        const error = new Error('You are not an authenticated user.') as CustomError;
        error.status = 401
        error.code = 'Error_Unauthenticated'
        return next(error)
    }
    if (!accessToken) {
        const error = new Error("Access Token has expired") as CustomError;
        error.status = 401;
        error.code = "Error_AccessTokenExpired";
        return next(error);
    }
    let decoded;
    try {
        decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as {
            id: number | string;
        };
    } catch (error: any) {
        error.status = 400;
        if (error.name === "TokenExpiredError") {
            error.message = "Access Token has expired";
            error.status = 400;
            error.code = "Error_AccessTokenExpired";
        } else {
            error.message = "Invalid Access Token";
            error.code = "Error_InvalidAccessToken";
        }
        return next(error);
    }
    req.userId = decoded.id;
    next()
}