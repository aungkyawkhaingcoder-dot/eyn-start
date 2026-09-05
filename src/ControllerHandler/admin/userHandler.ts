import { NextFunction,Request,Response } from "express";

export  const getUserHandler = (req:Request,res:Response,next:NextFunction)=>{ 
    res.status(200).json({
        message: "All Users",
    })
}