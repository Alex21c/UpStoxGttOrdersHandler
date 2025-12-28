import CustomError from "../Utils/CustomError.mjs";
import "dotenv/config";
import dotenv from "dotenv";
import UpstoxClient from "upstox-js-sdk";
import { db } from "../firebase.js";

dotenv.config();

export async function saveUpstoxTokenIntoFirebaseDB(code, accessToken, isUserLoggedIn) {
  await db.collection("brokerTokens").doc("upstox").set({
    code,
    accessToken,
    isUserLoggedIn,
    createdAt: new Date(),
  });
}

const loginAndGetAuthTokenFromUpstox = async (req, res, next) => {
  try {
    // Login
    let apiInstance = new UpstoxClient.LoginApi();
    let apiVersion = "2.0";
    let authData = {
      code: "",
      clientId: process.env.API_KEY,
      clientSecret: process.env.API_SECRET,
      redirectUri: process.env.REDIRECT_URL,
      grantType: "authorization_code",
    };

    // console.log(req);
    const { code } = req.query;
    if (!code) {
      return res.json({
        sucess: false,
        message: "Missing Code Query String !",
      });
    }
    authData.code = code;
    apiInstance.token(apiVersion, authData, async (error, data, response) => {
      if (error) {
        console.error(error);
        throw new Error(error.message);
      } else {
        // here access token is retrieved
        authData.accessToken = data?.accessToken;
        // make call to firebase DB and store
        await saveUpstoxTokenIntoFirebaseDB(authData.code, authData.accessToken, true);
        console.log("Login Successfull !");
      }
    });

    res.status(200).json({
      success: true,
      apiData: authData,
    });
  } catch (error) {
    console.log(error);
    return next(new CustomError(500, error.message));
  }
};

const callbackController = {
  loginAndGetAuthTokenFromUpstox,
};
export default callbackController;
