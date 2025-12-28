const serverURL = "http://localhost:3000";

const urls = {
  readOrdersFromGoogleSheet: `${serverURL}/api/v1/googleSheet/readOrdersFromGoogleSheet`,
  isUserConnectedWithUpStoxServer: `${serverURL}/api/v1/upstox/isUserConnectedWithUpStoxServer`,
  logoutUserFromUpstox: `${serverURL}/api/v1/upstox/logoutUserFromUpstox`,
};

export default urls;
