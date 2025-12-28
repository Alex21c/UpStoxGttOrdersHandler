import "./header.css";
import { useEffect } from "react";
import { useState } from "react";
import urls from "../../urls.mjs";

export default function Header() {
  const [stateIsUserLoggedIn, setStateIsUserLoggedIn] = useState(false);
  const [stateLoginURL, setStateLoginURL] = useState(null);

  async function checkLoginStatus() {
    let response = await fetch(urls?.isUserConnectedWithUpStoxServer);
    response = await response.json();
    if (response?.success) {
      const data = response.apiData;
      setStateIsUserLoggedIn(data.isUserLoggedIn);
      if (!data.isUserLoggedIn) {
        setStateLoginURL(data.loginURL);
      }
      // console.log(data);
    } else {
      console.log("Data not present in API Call !");
    }
  }

  useEffect(() => {
    // make an api call and check if user is logged in or not?
    checkLoginStatus();

    // now when user is redirect after login to same page check login status
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "success") {
      checkLoginStatus();
      // clean URL
      window.history.replaceState({}, "", "/");
    }
  }, []);

  async function logoutUserFromUpstox() {
    try {
      let response = await fetch(urls?.logoutUserFromUpstox);
      response = await response.json();
      if (response?.success) {
        const data = response.apiData;
        console.log(data.message);

        setTimeout(async () => {
          await checkLoginStatus();
        }, 1000);
      } else {
        console.log("Data not present in API Call !");
      }
    } catch (error) {
      console.log("Failed to make API Call !", error);
    }
  }

  return (
    <header>
      {stateIsUserLoggedIn === false && (
        <button
          className="btn"
          onClick={() => {
            if (stateLoginURL !== null) {
              window.location.href = stateLoginURL;
            } else {
              console.log("ERROR : login url is null!");
            }
          }}
        >
          Login
        </button>
      )}
      {stateIsUserLoggedIn === true && (
        <button onClick={logoutUserFromUpstox} className="btn">
          Logout
        </button>
      )}
    </header>
  );
}
