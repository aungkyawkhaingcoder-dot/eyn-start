import express from "express";
import { getAllUser } from "../../controller/admin/userController";
const  userRouter = express.Router();

 userRouter.get('/user',getAllUser);

export default userRouter