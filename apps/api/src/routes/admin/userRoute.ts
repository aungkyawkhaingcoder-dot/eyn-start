import express from "express";
import { getAllUser } from "../../controller/admin/userController";
import { authorise } from "../../middleware/authorise";
const  userRouter = express.Router();


 userRouter.use(authorise(true, 'ADMIN'));

 userRouter.get('/user',getAllUser);

export default userRouter