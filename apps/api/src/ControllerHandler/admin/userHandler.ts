import { NextFunction,Request,Response } from "express";
import { Prisma } from "../../generated/prisma/client";
interface CustomRequest extends Request{
    user?: Prisma.UserGetPayload<{}>;
}
export  const getUserHandler = (req:CustomRequest,res:Response,next:NextFunction)=>{ 
    const userId = req.user;
    res.status(200).json({
        message: req.t("welcome"),
        currentUserId: userId
    })
}