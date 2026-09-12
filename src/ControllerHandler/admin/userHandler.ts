import { NextFunction,Request,Response } from "express";
interface CustomRequest extends Request{
    userId?: number | string;
}
export  const getUserHandler = (req:CustomRequest,res:Response,next:NextFunction)=>{ 
    const userId = req.userId;
    res.status(200).json({
        message: "All Users",
        currentUserId: userId
    })
}