import CustomError from "../Utils/CustomError.mjs";
import "dotenv/config";

import { helperReadOrdersFromGoogleSheet } from "../Utils/dbUtil.mjs";

const readOrdersFromGoogleSheet = async (req, res, next) => {
  try {
    let response;
    // First Weekly Orders
    response = await helperReadOrdersFromGoogleSheet(false, true);
    const weeklyOrders = response?.weeklyOrders;

    // Intraday Orders
    response = await helperReadOrdersFromGoogleSheet(true, false);
    const intradayOrders = response?.intradayOrders;

    res.status(200).json({
      success: true,
      apiData: {
        intradayOrders,
        weeklyOrders,
      },
    });
  } catch (error) {
    console.log(error);
    return next(new CustomError(500, error.message));
  }
};

const googleSheetController = {
  readOrdersFromGoogleSheet,
};
export default googleSheetController;
