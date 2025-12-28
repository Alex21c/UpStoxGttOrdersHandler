import dotenv from "dotenv";
import UpstoxClient from "upstox-js-sdk";
dotenv.config();

let defaultClient = UpstoxClient.ApiClient.instance;
var OAUTH2 = defaultClient.authentications["OAUTH2"];
OAUTH2.accessToken = process.env.ACCESS_TOKEN;
let apiInstance = new UpstoxClient.OrderApiV3();
let entryRule = new UpstoxClient.GttRule(UpstoxClient.GttRule.StrategyEnum.ENTRY, UpstoxClient.GttRule.TriggerTypeEnum.BELOW, 2416);
let stopLossRule = new UpstoxClient.GttRule(UpstoxClient.GttRule.StrategyEnum.STOPLOSS, UpstoxClient.GttRule.TriggerTypeEnum.IMMEDIATE, 2403);
let targetRule = new UpstoxClient.GttRule(UpstoxClient.GttRule.StrategyEnum.TARGET, UpstoxClient.GttRule.TriggerTypeEnum.IMMEDIATE, 2481);

let body = new UpstoxClient.GttPlaceOrderRequest(
  UpstoxClient.GttPlaceOrderRequest.TypeEnum.MULTIPLE,
  1,
  UpstoxClient.GttPlaceOrderRequest.ProductEnum.I,
  [entryRule, stopLossRule, targetRule],
  "NSE_EQ|INE021A01026",
  UpstoxClient.GttPlaceOrderRequest.TransactionTypeEnum.BUY
);

apiInstance.placeGTTOrder(body, (error, data, response) => {
  if (error) {
    console.error(error.response.text);
  } else {
    console.log("API called successfully. Returned data:", data);
  }
});
