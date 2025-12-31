import e from "express";
import { makesureUserIsLoggedInToUpstoxServer } from "../Middlewares/upstoxMiddleware.mjs";
import upstoxController from "../Controllers/upstoxController.mjs";
import "dotenv/config";
const upstoxRoute = e.Router();

upstoxRoute.get("/isUserConnectedWithUpStoxServer", makesureUserIsLoggedInToUpstoxServer, upstoxController.isUserConnectedWithUpStoxServer);
upstoxRoute.get("/logoutUserFromUpstox", upstoxController.logoutUserFromUpstox);
upstoxRoute.get("/placeIntradayGttOrdersOnUpstox", makesureUserIsLoggedInToUpstoxServer, upstoxController.placeIntradayGttOrdersOnUpstox);
upstoxRoute.get("/placeWeeklyDeliveryGttOrdersOnUpstox", makesureUserIsLoggedInToUpstoxServer, upstoxController.placeWeeklyDeliveryGttOrdersOnUpstox);
upstoxRoute.get("/cancelAllIntradayGttOrdersOnUpstox", makesureUserIsLoggedInToUpstoxServer, upstoxController.cancelAllIntradayGttOrdersOnUpstox);
upstoxRoute.get("/cancelAllWeeklyDeliveryGttOrdersOnUpstox", makesureUserIsLoggedInToUpstoxServer, upstoxController.cancelAllWeeklyDeliveryGttOrdersOnUpstox);

export default upstoxRoute;
