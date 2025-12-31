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
      // check timestamp if it is one day old then mark user as logged out
      const createdAt = doc.data()?.createdAt;
      const createdAtDate = createdAt instanceof Date ? createdAt : createdAt.toDate();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const isTimestampExpired = Date.now() - createdAtDate.getTime() >= ONE_DAY_MS;
      // mark user as logged out
      if (isTimestampExpired) {
        await markUsedAsLoggedOutInFirebaseDB();
        throw new Error("Timestamp is Expired, please login once again !");
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
