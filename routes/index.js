import express from 'express';
import userRoute from './usersRoute.js';
import commonRoute from './commonRoutes.js';
import hostRoute from './hostRoute.js';
import adminRoute from "./adminRoute.js"

const router = express.Router();

router.use('/user', userRoute);
router.use("/common", commonRoute);
router.use('/host', hostRoute); 
router.use("/admin",adminRoute);


export default router;