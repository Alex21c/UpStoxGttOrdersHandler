import jwt from "jsonwebtoken";
import { google } from "googleapis";
import fs from "fs";
import { db, admin } from "../firebase.js";
export async function markUsedAsLoggedOutInFirebaseDB() {
  await db.collection("brokerTokens").doc("upstox").set({
    isUserLoggedIn: false,
  });
}
export function isJwtExpired(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      // Token has no expiry → treat as expired
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000); // seconds
    return decoded.exp < currentTime;
  } catch (error) {
    // Malformed token → expired
    console.log(error);
    return true;
  }
}

export async function storeExecutedGttOrderIdIntoDB(orderTypeIntradayOrDelivery = "INTRADAY", orderId) {
  try {
    // Safeguard
    if (orderTypeIntradayOrDelivery !== "INTRADAY" && orderTypeIntradayOrDelivery !== "DELIVERY") {
      throw new Error(`invalid orderTypeIntradayOrDelivery ${orderTypeIntradayOrDelivery}`);
    }

    if (!orderId) {
      throw new Error("orderId is required");
    }

    const docRef = db.collection("executedGttOrdersIds").doc(orderTypeIntradayOrDelivery);

    const doc = await docRef.get();

    // 1. create a new document if it does not exist
    if (!doc.exists) {
      await docRef.set({
        executedOrdersIds: [orderId],
      });
    }

    // 2. append to existing orders array
    await docRef.update({
      executedOrdersIds: admin.firestore.FieldValue.arrayUnion(orderId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. mark operation as successful
    return true;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
export async function emptyExecutedOrdersIdsArrayInsideDB(orderTypeIntradayOrDelivery = "INTRADAY") {
  try {
    // Safeguard
    if (orderTypeIntradayOrDelivery !== "INTRADAY" && orderTypeIntradayOrDelivery !== "DELIVERY") {
      throw new Error(`invalid orderTypeIntradayOrDelivery ${orderTypeIntradayOrDelivery}`);
    }

    const docRef = db.collection("executedGttOrdersIds").doc(orderTypeIntradayOrDelivery);
    const doc = await docRef.get();
    // Safeguard
    if (!doc.exists) {
      throw new Error(`${orderTypeIntradayOrDelivery} document doesn't exist inside DB !`);
    }

    // 2. clean
    await docRef.update({
      executedOrdersIds: [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. mark operation as successful
    return true;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getExecutedGttOrderIdFromDB(orderTypeIntradayOrDelivery = "INTRADAY") {
  try {
    // Safeguard
    if (orderTypeIntradayOrDelivery !== "INTRADAY" && orderTypeIntradayOrDelivery !== "DELIVERY") {
      throw new Error(`invalid orderTypeIntradayOrDelivery ${orderTypeIntradayOrDelivery}`);
    }
    const docRef = db.collection("executedGttOrdersIds").doc(orderTypeIntradayOrDelivery);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error("Document does not exist !");
    }
    const data = doc.data();
    if (data?.executedOrdersIds) {
      return data.executedOrdersIds;
    } else {
      throw new Error(`executedOrdersIds not found inside database for ${orderTypeIntradayOrDelivery}!`);
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function fetchUpstoxAccessTokenFromFirebaseDB() {
  const doc = await db.collection("brokerTokens").doc("upstox").get();

  if (!doc.exists) {
    return null;
  }

  return doc.data()?.accessToken || null;
}

export async function helperReadOrdersFromGoogleSheet(readIntradayOrders = false, readWeeklyOrders = false) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(fs.readFileSync("../backEnd/ApiKeys/googleSheetKeyUpStoxGttOrdersHandler.json")),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_ORDERS_SHEET_ID;

    let weeklyOrders = [];
    let intradayOrders = [];

    // Weekly Orders
    if (readWeeklyOrders) {
      let range = "Weekly!b:n";
      let response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      weeklyOrders = response.data.values;
    }

    // Intraday Orders
    if (readIntradayOrders) {
      let range = "Intraday!b:n";
      let response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      intradayOrders = response.data.values;
    }
    return { intradayOrders, weeklyOrders };
  } catch (error) {
    console.log(error);
    return error;
  }
}
