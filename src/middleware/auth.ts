import { NextFunction,Request,Response } from "express";
import { CustomError } from "../utils/commonType";

export const authMiddleware  = (req:Request,res:Response,next:NextFunction)=>{
    const accessToken = req.cookies ? req.cookies.accessToken : null;
    const refreshToken = req.cookies ? req.cookies.refreshToken: null;


    if(!refreshToken){
        const error = new Error('You are not an authenticated user.') as CustomError ;
        error.status = 401
        error.code = 'Error_Unauthenticated'
        return next(error)
    }
    if(!accessToken){
       const error = new Error("Access Token has expired") as CustomError;
        error.status =  401;
        error.code = "Error_AccessTokenExpired";
        return next(error);
    }

   next()
}