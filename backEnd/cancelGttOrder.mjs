import dotenv from "dotenv";
import UpstoxClient from "upstox-js-sdk";
dotenv.config();

let defaultClient = UpstoxClient.ApiClient.instance;
var OAUTH2 = defaultClient.authentications["OAUTH2"];
OAUTH2.accessToken = process.env.ACCESS_TOKEN;

let apiInstance = new UpstoxClient.OrderApiV3();
let body = new UpstoxClient.GttCancelOrderRequest("GTT-C25261200140093");

apiInstance.cancelGTTOrder(body, (error, data, response) => {
  if (error) {
    console.error(error.response.text);
  } else {
    console.log("API called successfully. Returned data:", data);
  }
});
