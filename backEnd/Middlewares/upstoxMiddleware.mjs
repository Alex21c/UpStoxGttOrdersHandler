import { fetchUpstoxAccessTokenFromFirebaseDB } from "../Utils/dbUtil.mjs";
import { isJwtExpired } from "../Utils/dbUtil.mjs";
import { db } from "../firebase.js";
import { markUsedAsLoggedOutInFirebaseDB } from "../Utils/dbUtil.mjs";
import CustomError from "../Utils/CustomError.mjs";

export const makesureUserIsLoggedInToUpstoxServer = async (req, res, next) => {
  try {
    const doc = await db.collection("brokerTokens").doc("upstox").get();
    if (!doc.exists) {
      return next(new CustomError(400, "upstox document doesn't exit in firebase DB !"));
    }

    try {
      if (!doc.data()?.isUserLoggedIn) {
        throw new Error("User is not logged in with upstox server !");
      }
      // is upstox token expired
      const accessToken = await fetchUpstoxAccessTokenFromFirebaseDB();
      if (!accessToken || isJwtExpired(accessToken) == true) {
        await markUsedAsLoggedOutInFirebaseDB();
        throw new Error("upstox AuthToken is Expired, please login once again !");
      }
    } catch (error) {
      console.log(error.message);
      return res.status(200).json({
        success: true,
        apiData: {
          message: error.message,
          isUserLoggedIn: doc.data()?.isUserLoggedIn,
          loginURL: `https://api.upstox.com/v2/login/authorization/dialog?client_id=${process.env.API_KEY}&redirect_uri=${process.env.REDIRECT_URL}`,
        },
      });
    }

    next();
  } catch (error) {
    return next(new CustomError(400, error.message));
  }
};
