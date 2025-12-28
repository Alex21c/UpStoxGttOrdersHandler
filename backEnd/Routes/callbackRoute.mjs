import e from "express";
import callbackController from "../Controllers/callbackController.mjs";
import "dotenv/config";
const callbackRoute = e.Router();

callbackRoute.get("", callbackController.loginAndGetAuthTokenFromUpstox);

export default callbackRoute;
