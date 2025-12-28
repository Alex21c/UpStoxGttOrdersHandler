import e from "express";
import upstoxController from "../Controllers/upstoxController.mjs";
import "dotenv/config";
const upstoxRoute = e.Router();

upstoxRoute.get("/isUserConnectedWithUpStoxServer", upstoxController.isUserConnectedWithUpStoxServer);
upstoxRoute.get("/logoutUserFromUpstox", upstoxController.logoutUserFromUpstox);

export default upstoxRoute;
