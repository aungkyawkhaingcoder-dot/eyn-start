import { Request, Response } from "express";

export const languageController = async (req:Request,res:Response):Promise<void>=>{
    const { lng } = req.query;
    res.cookie('i18next', lng);
    res.status(200).json({ message: "Language changed successfully" });
}