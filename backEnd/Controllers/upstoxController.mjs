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

// initialize upstox api
let defaultClient = UpstoxClient.ApiClient.instance;
var OAUTH2 = defaultClient.authentications["OAUTH2"];
let apiInstance = new UpstoxClient.OrderApiV3();

export async function markUsedAsLoggedOutInFirebaseDB() {
  await db.collection("brokerTokens").doc("upstox").set({
    isUserLoggedIn: false,
  });
}

const logoutUserFromUpstox = async (req, res, next) => {
  try {
    let apiInstance = new UpstoxClient.LoginApi();
    let apiVersion = "2.0";

    // logout
    let defaultClient = UpstoxClient.ApiClient.instance;
    let OAUTH2 = defaultClient.authentications["OAUTH2"];

    OAUTH2.accessToken = await fetchUpstoxAccessTokenFromFirebaseDB();
    if (!OAUTH2.accessToken) {
      throw new Error("auth Token not present in firebase DB ! User might be already logged out !");
    }

    apiInstance.logout(apiVersion, async (error, data, response) => {
      if (error) {
        console.error(error);
        throw new Error(error.message);
      } else {
        await markUsedAsLoggedOutInFirebaseDB();
        console.log("API called successfully. Returned data: " + data);
      }
    });

    res.status(200).json({
      success: true,
      apiData: {
        message: "logged out successfully !",
      },
    });
  } catch (error) {
    console.log(error);
    return next(new CustomError(500, error.message));
  }
};

const isUserConnectedWithUpStoxServer = async (req, res, next) => {
  try {
    const doc = await db.collection("brokerTokens").doc("upstox").get();
    if (!doc.exists) {
      throw new Error("upstox document doesn't exit in firebase DB !");
    }

    res.status(200).json({
      success: true,
      apiData: {
        isUserLoggedIn: doc.data()?.isUserLoggedIn,
        loginURL: `https://api.upstox.com/v2/login/authorization/dialog?client_id=${process.env.API_KEY}&redirect_uri=${process.env.REDIRECT_URL}`,
      },
    });
  } catch (error) {
    console.log(error);
    return next(new CustomError(500, error.message));
  }
};

async function placeGttOrdersOnUpstox({ script, zone, quantity, entry, sl, target, nseEqScriptKey }, orderTypeIntradayOrDelivery = "INTRADAY") {
  try {
    OAUTH2.accessToken = await fetchUpstoxAccessTokenFromFirebaseDB();
    if (OAUTH2.accessToken == null) {
      throw new Error("Access token fetched from firebase DB is Null !");
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
    if (orderTypeIntradayOrDelivery === "INTRADAY") {
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
    console.log(`isOrderCancelled ${isOrderCancelled}`);
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
        const nseEqScriptKey = data[12];
        ordersCoreData.push({ script, zone, quantity, entry, sl, target, nseEqScriptKey });
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
      const executedGttOrderId = await placeGttOrdersOnUpstox(orderData, "INTRADAY");
      const orderSignature = `${orderData?.script} ${orderData?.zone} ${orderData?.quantity} ${orderData?.entry} ${orderData?.sl} ${orderData?.target}`;

      if (!executedGttOrderId) {
        executedOrdersReponse.push(`Failed to place intraday GTT order ${orderSignature}`);
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
const cancelIntradayGttOrdersOnUpstox = async (req, res, next) => {
  try {
    // 1. fetch executed gtt intraday orders IDs from firebase DB
    const ordersIdsToCancel = await getExecutedGttOrderIdFromDB("INTRADAY");
    console.log(ordersIdsToCancel);
    // 2. Traverse through each ID and make api call to upstox to cancel the gtt order
    const successfullyCancelledOrders = [];
    for (const orderID of ordersIdsToCancel) {
      console.log(`cancelling ${orderID}`);
      await cancelGttOrdersOnUpstox(orderID, "INTRADAY");
      // add to successfullyCancelledOrders
      successfullyCancelledOrders.push(orderID);
    }

    // 3. Clean INTRADAY document in firebase DB with empty Array []
    // await emptyExecutedOrdersIdsArrayInsideDB("INTRADAY");

    // Send response
    res.status(200).json({
      success: true,
      apiData: {
        successfullyCancelledOrders,
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
  cancelIntradayGttOrdersOnUpstox,
};
export default upstoxController;
