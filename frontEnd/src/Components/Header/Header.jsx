import "./header.css";
import { useEffect } from "react";
import { useState } from "react";
import urls from "../../urls.mjs";

export default function Header() {
  const [stateIsUserLoggedIn, setStateIsUserLoggedIn] = useState(null);
  const [stateLoginURL, setStateLoginURL] = useState(null);
  useEffect(() => {
    // make an api call and check if user is logged in or not?
    const makeApiCall = async () => {
      try {
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
      } catch (error) {
        console.log("Failed to make API Call !", error);
      }
    };

    makeApiCall();
  }, []);

  async function logoutUserFromUpstox() {
    try {
      let response = await fetch(urls?.logoutUserFromUpstox);
      response = await response.json();
      if (response?.success) {
        const data = response.apiData;
        console.log(data.message);
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
        <a className="loginButtonLink" href={stateLoginURL} target="_blank">
          Login
        </a>
      )}
      {stateIsUserLoggedIn === true && (
        <button onClick={logoutUserFromUpstox} className="logoutBtn">
          Logout
        </button>
      )}
    </header>
  );
}
