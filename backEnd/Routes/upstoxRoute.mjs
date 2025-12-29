import e from "express";
import upstoxController from "../Controllers/upstoxController.mjs";
import "dotenv/config";
const upstoxRoute = e.Router();

upstoxRoute.get("/isUserConnectedWithUpStoxServer", upstoxController.isUserConnectedWithUpStoxServer);
upstoxRoute.get("/logoutUserFromUpstox", upstoxController.logoutUserFromUpstox);
upstoxRoute.get("/placeIntradayGttOrdersOnUpstox", upstoxController.placeIntradayGttOrdersOnUpstox);
upstoxRoute.get("/cancelIntradayGttOrdersOnUpstox", upstoxController.cancelIntradayGttOrdersOnUpstox);

export default upstoxRoute;
