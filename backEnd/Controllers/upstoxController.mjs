import CustomError from "../Utils/CustomError.mjs";
import "dotenv/config";
import dotenv from "dotenv";
import UpstoxClient from "upstox-js-sdk";
import { db } from "../firebase.js";
import { fetchUpstoxAccessTokenFromFirebaseDB } from "../Utils/dbUtil.mjs";
dotenv.config();

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

const upstoxController = {
  isUserConnectedWithUpStoxServer,
  logoutUserFromUpstox,
};
export default upstoxController;
