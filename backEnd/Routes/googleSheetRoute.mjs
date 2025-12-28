import e from "express";
import googleSheetController from "../Controllers/googleSheetController.mjs";
import "dotenv/config";
const googleSheetRoute = e.Router();

googleSheetRoute.get("/readOrdersFromGoogleSheet", googleSheetController.readOrdersFromGoogleSheet);

export default googleSheetRoute;
