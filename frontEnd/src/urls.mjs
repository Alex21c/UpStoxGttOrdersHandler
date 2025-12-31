const serverURL = "http://localhost:3000";

const urls = {
  readOrdersFromGoogleSheet: `${serverURL}/api/v1/googleSheet/readOrdersFromGoogleSheet`,
  isUserConnectedWithUpStoxServer: `${serverURL}/api/v1/upstox/isUserConnectedWithUpStoxServer`,
  logoutUserFromUpstox: `${serverURL}/api/v1/upstox/logoutUserFromUpstox`,
  placeIntradayGttOrdersOnUpstox: `${serverURL}/api/v1/upstox/placeIntradayGttOrdersOnUpstox`,
  placeWeeklyDeliveryGttOrdersOnUpstox: `${serverURL}/api/v1/upstox/placeWeeklyDeliveryGttOrdersOnUpstox`,
  cancelAllIntradayGttOrdersOnUpstox: `${serverURL}/api/v1/upstox/cancelAllIntradayGttOrdersOnUpstox`,
  cancelAllWeeklyDeliveryGttOrdersOnUpstox: `${serverURL}/api/v1/upstox/cancelAllWeeklyDeliveryGttOrdersOnUpstox`,
};

export default urls;
