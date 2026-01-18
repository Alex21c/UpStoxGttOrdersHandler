import { isJwtExpired } from "../Utils/dbUtil.mjs";
import CustomError from "../Utils/CustomError.mjs";
import "dotenv/config";
import dotenv from "dotenv";
import UpstoxClient from "upstox-js-sdk";
import { db } from "../firebase.js";
import { helperReadOrdersFromGoogleSheet } from "../Utils/dbUtil.mjs";
import { fetchUpstoxAccessTokenFromFirebaseDB } from "../Utils/dbUtil.mjs";
import { storeExecutedGttOrderIdIntoDB } from "../Utils/dbUtil.mjs";
import { getExecutedGttOrderIdFromDB } from "../Utils/dbUtil.mjs";
import { emptyExecutedOrdersIdsArrayInsideDB } from "../Utils/dbUtil.mjs";
dotenv.config();
import { markUsedAsLoggedOutInFirebaseDB } from "../Utils/dbUtil.mjs";
// initialize upstox api
let defaultClient = UpstoxClient.ApiClient.instance;
var OAUTH2 = defaultClient.authentications["OAUTH2"];
let apiInstance = new UpstoxClient.OrderApiV3();
let apiInstanceQuotApi = new UpstoxClient.MarketQuoteApi();
let apiVersion = "2.0";

function helperLogoutFromUpstox(apiInstance, apiVersion) {
  return new Promise((resolve, reject) => {
    apiInstance.logout(apiVersion, (error, data, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}
const logoutUserFromUpstox = async (req, res, next) => {
  try {
    let apiInstance = new UpstoxClient.LoginApi();

    // logout
    let defaultClient = UpstoxClient.ApiClient.instance;
    let OAUTH2 = defaultClient.authentications["OAUTH2"];

    OAUTH2.accessToken = await fetchUpstoxAccessTokenFromFirebaseDB();
    if (!OAUTH2.accessToken) {
      throw new Error("auth Token not present in firebase DB ! User might be already logged out !");
    }
    await helperLogoutFromUpstox(apiInstance, apiVersion);

    res.status(200).json({
      success: true,
      apiData: {
        message: "logged out successfully !",
      },
    });
  } catch (error) {
    console.log(error);
    return next(new CustomError(500, error.message));
  } finally {
    await markUsedAsLoggedOutInFirebaseDB();
  }
};

const isUserConnectedWithUpStoxServer = async (req, res, next) => {
  try {
    const doc = await db.collection("brokerTokens").doc("upstox").get();
    if (!doc.exists) {
      throw new Error("upstox document doesn't exit in firebase DB !");
    }
    // is upstox token expired
    const accessToken = await fetchUpstoxAccessTokenFromFirebaseDB();
    let isUserLoggedIn = doc.data()?.isUserLoggedIn;
    if (!accessToken || isJwtExpired(accessToken) == true) {
      isUserLoggedIn = false;
    }

    // return response
    res.status(200).json({
      success: true,
      apiData: {
        isUserLoggedIn,
        loginURL: `https://api.upstox.com/v2/login/authorization/dialog?client_id=${process.env.API_KEY}&redirect_uri=${process.env.REDIRECT_URL}`,
      },
    });
  } catch (error) {
    console.log(error);
    return next(new CustomError(500, error.message));
  }
};
function getLTP(apiInstanceQuotApi, apiVersion, nseEqScriptKey) {
  return new Promise((resolve, reject) => {
    apiInstanceQuotApi.ltp(nseEqScriptKey, apiVersion, (error, data, response) => {
      if (error) {
        console.error(error.response?.text);
        return reject(error);
      }

      try {
        const objResponse = data?.data;
        const firstKey = Object.keys(objResponse)[0];
        // console.log(firstKey);
        const lastPrice = objResponse[firstKey].lastPrice;

        resolve(lastPrice); // return gtt order id
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function placeGttOrdersOnUpstox({ script, zone, quantity, entry, sl, target, risk, nseEqScriptKey }, orderTypeIntradayOrDelivery = "INTRADAY") {
  try {
    // safeguard
    if (script === "PLACEHOLDER_SCRIPT" || quantity == 0) {
      throw new Error(`order placement skipped for script: ${script}, quantity: ${quantity}`);
    }
    OAUTH2.accessToken = await fetchUpstoxAccessTokenFromFirebaseDB();
    if (OAUTH2.accessToken == null) {
      throw new Error("Access token fetched from firebase DB is Null !");
    }

    // safeguard IF Risk is greater than MAX_RISK_PER_TRADE then skip order
    if (Math.abs(risk) > Math.abs(process.env.MAX_RISK_PER_TRADE)) {
      throw new Error(`order placement skipped for script: ${script}, quantity: ${quantity}, RISK (${risk}) is greater than MAX_RISK_PER_TRADE (${process.env.MAX_RISK_PER_TRADE})`);
    }

    // Safeguard IF LTP is not respecting the SL
    const scriptLTP = await getLTP(apiInstanceQuotApi, apiVersion, nseEqScriptKey);
    if (zone === "DZ" && scriptLTP <= sl) {
      throw new Error(`order placement skipped for script: ${script}, quantity: ${quantity}, ${scriptLTP} <= ${sl}, LTP is not respecting the SL`);
    } else if (zone === "SZ" && scriptLTP >= sl) {
      throw new Error(`order placement skipped for script: ${script}, quantity: ${quantity}, ${scriptLTP} >= ${sl}, LTP is not respecting the SL`);
    }
  } catch (error) {
    throw error;
  }

  let entryRule;
  let transactionTypeEnum;
  if (zone === "DZ") {
    transactionTypeEnum = UpstoxClient.GttPlaceOrderRequest.TransactionTypeEnum.BUY;
    entryRule = new UpstoxClient.GttRule(UpstoxClient.GttRule.StrategyEnum.ENTRY, UpstoxClient.GttRule.TriggerTypeEnum.BELOW, entry);
  } else if (zone === "SZ") {
    transactionTypeEnum = UpstoxClient.GttPlaceOrderRequest.TransactionTypeEnum.SELL;
    entryRule = new UpstoxClient.GttRule(UpstoxClient.GttRule.StrategyEnum.ENTRY, UpstoxClient.GttRule.TriggerTypeEnum.ABOVE, entry);
  } else {
    throw new Error(`supplied zone : ${zone} is invalid`);
  }

  let stopLossRule = new UpstoxClient.GttRule(UpstoxClient.GttRule.StrategyEnum.STOPLOSS, UpstoxClient.GttRule.TriggerTypeEnum.IMMEDIATE, sl);
  let targetRule = new UpstoxClient.GttRule(UpstoxClient.GttRule.StrategyEnum.TARGET, UpstoxClient.GttRule.TriggerTypeEnum.IMMEDIATE, target);

  let enumIntradayOrDelivery;
  if (orderTypeIntradayOrDelivery === "INTRADAY") {
    enumIntradayOrDelivery = UpstoxClient.GttPlaceOrderRequest.ProductEnum.I;
  } else if (orderTypeIntradayOrDelivery === "DELIVERY") {
    enumIntradayOrDelivery = UpstoxClient.GttPlaceOrderRequest.ProductEnum.D;
  } else {
    throw new Error(`invalid orderTypeIntradayOrDelivery : ${orderTypeIntradayOrDelivery} `);
  }
  let body = new UpstoxClient.GttPlaceOrderRequest(UpstoxClient.GttPlaceOrderRequest.TypeEnum.MULTIPLE, quantity, enumIntradayOrDelivery, [entryRule, stopLossRule, targetRule], nseEqScriptKey, transactionTypeEnum);
  function placeGttOrderAsync(apiInstance, body) {
    return new Promise((resolve, reject) => {
      apiInstance.placeGTTOrder(body, (error, data, response) => {
        if (error) {
          console.error(error.response?.text);
          return reject(error);
        }

        try {
          const executedGttOrderId = data?.data?.gttOrderIds?.[0];

          if (!executedGttOrderId) {
            throw new Error("executedGttOrderId is invalid");
          }

          resolve(executedGttOrderId); // return gtt order id
        } catch (err) {
          reject(err);
        }
      });
    });
  }
  let executedGttOrderId;
  try {
    executedGttOrderId = await placeGttOrderAsync(apiInstance, body);

    // store this id into firebase
    if (orderTypeIntradayOrDelivery === "INTRADAY" || orderTypeIntradayOrDelivery === "DELIVERY") {
      // firebase logic here
      await storeExecutedGttOrderIdIntoDB(orderTypeIntradayOrDelivery, executedGttOrderId);
    }
  } catch (err) {
    console.error("Failed to place GTT order:", err);
  }

  return executedGttOrderId;
}
async function cancelGttOrdersOnUpstox(gttOrderId = null, orderTypeIntradayOrDelivery = "INTRADAY") {
  try {
    // Safeguard
    if (gttOrderId == null) {
      throw new Error(`supplied null gttOrderId inside placeGttOrdersOnUpstox()`);
    } else if (orderTypeIntradayOrDelivery !== "INTRADAY" && orderTypeIntradayOrDelivery !== "DELIVERY") {
      throw new Error(`invalid orderTypeIntradayOrDelivery : ${orderTypeIntradayOrDelivery} `);
    }

    OAUTH2.accessToken = await fetchUpstoxAccessTokenFromFirebaseDB();
    if (OAUTH2.accessToken == null) {
      throw new Error("Access token fetched from firebase DB is Null !");
    }

    let body = new UpstoxClient.GttCancelOrderRequest(gttOrderId);

    function cancelGttOrderAsync(apiInstance, body) {
      return new Promise((resolve, reject) => {
        apiInstance.cancelGTTOrder(body, (error, data, response) => {
          if (error) {
            // failed to cancel the order
            resolve(false);
          } else {
            // successfully cancelled the order
            resolve(true);
          }
        });
      });
    }

    const isOrderCancelled = await cancelGttOrderAsync(apiInstance, body);
    // console.log(`isOrderCancelled ${isOrderCancelled}`);
    return isOrderCancelled;
  } catch (error) {
    throw error;
  }
}

function helperKeepOrdersCoreDataOnly(orders = null) {
  try {
    if (orders == null) {
      throw new Error(`invalid ordres data ${orders} inside helperKeepOrdersCoreDataOnly()`);
    }
    const ordersCoreData = [];
    orders.forEach((data, idx) => {
      try {
        if (idx == 0) {
          return;
        }

        const script = data[1];
        const zone = data[4];
        const quantity = data[5];
        const entry = data[6];
        const sl = data[7];
        const target = data[8];
        const risk = data[9];
        const nseEqScriptKey = data[12];
        ordersCoreData.push({ script, zone, quantity, entry, sl, target, risk, nseEqScriptKey });
      } catch (error) {
        throw new Error(error);
      }
    });

    return ordersCoreData;
  } catch (error) {
    throw error;
  }
}
const placeIntradayGttOrdersOnUpstox = async (req, res, next) => {
  try {
    // 1. fetch intraday orders from google sheet
    const response = await helperReadOrdersFromGoogleSheet(true);
    const intradayOrders = response?.intradayOrders;
    // 2. check if orders are empty then throw error that orders are empty
    if (intradayOrders?.length <= 1) {
      // means only header row is there
      throw new Error("Intraday orders fetched from google sheet are Empty !");
    }
    // traverse through order array and construct a new array containing only order relevant data
    const intradayOrdersCoreData = helperKeepOrdersCoreDataOnly(intradayOrders);

    // safeguard
    if (intradayOrdersCoreData.length <= 0) {
      throw new Error("intradayOrdersCoreData empty  !");
    }

    // traverse each order and make api call to upstox
    const executedOrdersReponse = [];
    for (const orderData of intradayOrdersCoreData) {
      let executedGttOrderId = null;
      let isThereAnyError = false;
      let errorMsg = "";
      try {
        executedGttOrderId = await placeGttOrdersOnUpstox(orderData, "INTRADAY");
      } catch (error) {
        isThereAnyError = true;
        errorMsg = error?.message;
        console.log(error.message);
      }
      const orderSignature = `${orderData?.script} ${orderData?.zone} ${orderData?.quantity} ${orderData?.entry} ${orderData?.sl} ${orderData?.target}`;

      if (!executedGttOrderId) {
        executedOrdersReponse.push(`Failed to place intraday GTT order ${orderSignature}`);
        executedOrdersReponse.push(errorMsg);
      } else {
        console.log(`executed order ${executedGttOrderId}`);
        executedOrdersReponse.push(`Successfully Executed intraday GTT order (${executedGttOrderId}) ${orderSignature}`);
      }
    }

    // Send response
    res.status(200).json({
      success: true,
      apiData: {
        message: executedOrdersReponse,
      },
    });
  } catch (error) {
    console.log(error);
    return next(new CustomError(500, error.message));
  }
};

const placeWeeklyDeliveryGttOrdersOnUpstox = async (req, res, next) => {
  try {
    // 1. fetch intraday orders from google sheet
    const response = await helperReadOrdersFromGoogleSheet(false, true);

    const weeklyDeliveryOrders = response?.weeklyOrders;

    // 2. check if orders are empty then throw error that orders are empty
    if (weeklyDeliveryOrders?.length <= 1) {
      // means only header row is there
      throw new Error("Weekly Delivery orders fetched from google sheet are Empty !");
    }
    // traverse through order array and construct a new array containing only order relevant data
    const weeklyDeliveryOrdersCoreData = helperKeepOrdersCoreDataOnly(weeklyDeliveryOrders);

    // safeguard
    if (weeklyDeliveryOrdersCoreData.length <= 0) {
      throw new Error("weeklyDeliveryOrdersCoreData empty  !");
    }

    // traverse each order and make api call to upstox
    const executedOrdersReponse = [];
    for (const orderData of weeklyDeliveryOrdersCoreData) {
      let executedGttOrderId = null;
      let isThereAnyError = false;
      let errorMsg = "";
      try {
        executedGttOrderId = await placeGttOrdersOnUpstox(orderData, "DELIVERY");
      } catch (error) {
        isThereAnyError = true;
        errorMsg = error?.message;
        console.log(error.message);
      }
      const orderSignature = `${orderData?.script} ${orderData?.zone} ${orderData?.quantity} ${orderData?.entry} ${orderData?.sl} ${orderData?.target}`;

      if (!executedGttOrderId) {
        executedOrdersReponse.push(`Failed to place Weekly Delivery GTT order ${orderSignature}`);
        executedOrdersReponse.push(errorMsg);
      } else {
        console.log(`executed order ${executedGttOrderId}`);
        executedOrdersReponse.push(`Successfully Executed Weekly Delivery GTT order (${executedGttOrderId}) ${orderSignature}`);
      }
    }

    // Send response
    res.status(200).json({
      success: true,
      apiData: {
        message: executedOrdersReponse,
      },
    });
  } catch (error) {
    console.log(error);
    return next(new CustomError(500, error.message));
  }
};

const cancelAllWeeklyDeliveryGttOrdersOnUpstox = async (req, res, next) => {
  try {
    // 1. fetch executed gtt weekly delivery orders IDs from firebase DB
    const ordersIdsToCancel = await getExecutedGttOrderIdFromDB("DELIVERY");
    // 2. Traverse through each ID and make api call to upstox to cancel the gtt order
    const successfullyCancelledOrders = [];
    const failedToCancelledOrders = [];
    if (ordersIdsToCancel.length <= 0) {
      throw new Error("There were no GTT orders to cancel in DB!");
    }
    for (const orderID of ordersIdsToCancel) {
      // console.log(`cancelling ${orderID}`);
      const isGttOrderSuccessfullyCancelled = await cancelGttOrdersOnUpstox(orderID, "DELIVERY");
      if (isGttOrderSuccessfullyCancelled) {
        successfullyCancelledOrders.push(orderID);
      } else {
        failedToCancelledOrders.push(orderID);
      }
    }

    // 3. Clean DELIVERY document in firebase DB with empty Array []
    await emptyExecutedOrdersIdsArrayInsideDB("DELIVERY");

    // Send response
    res.status(200).json({
      success: true,
      apiData: {
        successfullyCancelledOrders,
        failedToCancelledOrders,
      },
    });
  } catch (error) {
    console.log(error);
    return next(new CustomError(500, error.message));
  }
};

const cancelAllIntradayGttOrdersOnUpstox = async (req, res, next) => {
  try {
    // 1. fetch executed gtt intraday orders IDs from firebase DB
    const ordersIdsToCancel = await getExecutedGttOrderIdFromDB("INTRADAY");
    // console.log(ordersIdsToCancel);
    // 2. Traverse through each ID and make api call to upstox to cancel the gtt order
    const successfullyCancelledOrders = [];
    const failedToCancelledOrders = [];
    if (ordersIdsToCancel.length <= 0) {
      throw new Error("There were no GTT orders to cancel in DB!");
    }
    for (const orderID of ordersIdsToCancel) {
      // console.log(`cancelling ${orderID}`);
      const isGttOrderSuccessfullyCancelled = await cancelGttOrdersOnUpstox(orderID, "INTRADAY");
      if (isGttOrderSuccessfullyCancelled) {
        successfullyCancelledOrders.push(orderID);
      } else {
        failedToCancelledOrders.push(orderID);
      }
    }

    // 3. Clean INTRADAY document in firebase DB with empty Array []
    await emptyExecutedOrdersIdsArrayInsideDB("INTRADAY");

    // Send response
    res.status(200).json({
      success: true,
      apiData: {
        successfullyCancelledOrders,
        failedToCancelledOrders,
      },
    });
  } catch (error) {
    console.log(error);
    return next(new CustomError(500, error.message));
  }
};

const upstoxController = {
  isUserConnectedWithUpStoxServer,
  logoutUserFromUpstox,
  placeIntradayGttOrdersOnUpstox,
  placeWeeklyDeliveryGttOrdersOnUpstox,
  cancelAllIntradayGttOrdersOnUpstox,
  cancelAllWeeklyDeliveryGttOrdersOnUpstox,
};
export default upstoxController;
