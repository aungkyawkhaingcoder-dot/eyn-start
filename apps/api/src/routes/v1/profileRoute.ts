import { Router } from "express";
import { changeLanguage } from "../../controller/profileController";

const routerLanguage = Router();

routerLanguage.post("/change-language", changeLanguage);

export default routerLanguage;