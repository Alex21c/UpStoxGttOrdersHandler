import { db } from "../firebase.js";
export async function fetchUpstoxAccessTokenFromFirebaseDB() {
  const doc = await db.collection("brokerTokens").doc("upstox").get();

  if (!doc.exists) {
    return null;
  }

  return doc.data()?.accessToken || null;
}
