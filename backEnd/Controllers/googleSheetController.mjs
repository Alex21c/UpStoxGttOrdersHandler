import CustomError from "../Utils/CustomError.mjs";
import "dotenv/config";
import { google } from "googleapis";
import fs from "fs";

const readOrdersFromGoogleSheet = async (req, res, next) => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(fs.readFileSync("../backEnd/ApiKeys/googleSheetKeyUpStoxGttOrdersHandler.json")),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = "1na54OOgt_hmK2kOG7hxzeD-TgUvCWOgDI4s7j3T3lmg";

    // First Weekly Orders
    let range = "Weekly!b:n";
    let response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    const weeklyOrders = response.data.values;
    // console.log(weeklyOrders);

    // Intraday Orders
    range = "Intraday!b:n";
    response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    const intradayOrders = response.data.values;
    // console.log(intradayOrders);
    res.status(200).json({
      success: true,
      apiData: {
        intradayOrders,
        weeklyOrders,
      },
    });

    // res.status(200).json({
    //   success: true,
    //   apiData: {
    //     intradayOrders: [
    //       ["DATE", "SCRIPT", "TIMEFRAME (ENTRY)", "TradeType", "ZONE", "QUANTITY", "ENTRY", "SL", "TARGET", "RISK", "REWARD", "CAPITAL REQUIRED", "NseEqScriptKey"],
    //       ["28-Dec-2025", "ASIANPAINT", "2Hr", "Delivery", "SZ", 1, 4000, 4010, 3950, "-₹10", "₹50", "₹4,000", "NSE_EQ|INE021A01026"],
    //       ["28-Dec-2025", "ASIANPAINT", "2Hr", "Delivery", "DZ", 1, 4000, 3990, 4050, "-₹10", "₹50", "₹4,000", "NSE_EQ|INE021A01026"],
    //     ],
    //     weeklyOrders: [
    //       ["DATE", "SCRIPT", "TIMEFRAME (ENTRY)", "TradeType", "ZONE", "QUANTITY", "ENTRY", "SL", "TARGET", "RISK", "REWARD", "CAPITAL REQUIRED", "NseEqScriptKey"],
    //       ["28-Dec-2025", "ASIANPAINT", "2Hr", "Delivery", "DZ", 1, 4000, 3990, 4050, "-₹10", "₹50", "₹4,000", "NSE_EQ|INE021A01026"],
    //     ],
    //   },
    // });
  } catch (error) {
    console.log(error);
    return next(new CustomError(500, error.message));
  }
};

const googleSheetController = {
  readOrdersFromGoogleSheet,
};
export default googleSheetController;
