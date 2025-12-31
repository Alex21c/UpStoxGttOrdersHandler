import Logger from "./Components/Logger/Logger";
import { useEffect, useState } from "react";
import OrdersTable from "./Components/OrdersTable/OrdersTable";
import Header from "./Components/Header/Header";
import "./App.css";
import urls from "./urls.mjs";
function App() {
  const [stateLoggerData, setStateLoggerData] = useState(["Logger"]);
  const [stateIntradayOrdersHeaderRow, setStateIntradayOrdersHeaderRow] = useState(null);
  const [stateIntradayOrders, setStateIntradayOrders] = useState(null);
  const [stateWeeklyOrdersHeaderRow, setStateWeeklyOrdersHeaderRow] = useState(null);
  const [stateWeeklyOrders, setStateWeeklyOrders] = useState(null);
  const [stateIsUserLoggedIn, setStateIsUserLoggedIn] = useState(false);
  const [isPlacingOrCancellingOrder, setIsPlacingOrCancellingOrder] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        // const response = await axios.get(urls?.readOrdersFromGoogleSheet);
        let response = await fetch(urls?.readOrdersFromGoogleSheet);
        response = await response.json();
        if (response?.success) {
          const data = response.apiData;
          setStateIntradayOrders(data.intradayOrders.slice(1));
          setStateIntradayOrdersHeaderRow(data.intradayOrders[0]);
          setStateWeeklyOrders(data.weeklyOrders.slice(1));
          setStateWeeklyOrdersHeaderRow(data.weeklyOrders[0]);
        } else {
          console.log("Data not present in API Call !");
        }
      } catch (error) {
        console.log("Failed to make API Call !", error);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      <Header stateIsUserLoggedIn={stateIsUserLoggedIn} setStateIsUserLoggedIn={setStateIsUserLoggedIn} />
      {stateIsUserLoggedIn && (
        <div className="wrapperOrdersTableAndLogger">
          <Logger stateLoggerData={stateLoggerData} setStateLoggerData={setStateLoggerData} />
          <div>
            <OrdersTable
              setStateLoggerData={setStateLoggerData}
              isPlacingOrCancellingOrder={isPlacingOrCancellingOrder}
              setIsPlacingOrCancellingOrder={setIsPlacingOrCancellingOrder}
              orderType="INTRADAY"
              ordersHeaderRow={stateIntradayOrdersHeaderRow}
              orders={stateIntradayOrders}
            />
            <br />
            <OrdersTable
              setStateLoggerData={setStateLoggerData}
              isPlacingOrCancellingOrder={isPlacingOrCancellingOrder}
              setIsPlacingOrCancellingOrder={setIsPlacingOrCancellingOrder}
              orderType="WEEKLY"
              ordersHeaderRow={stateWeeklyOrdersHeaderRow}
              orders={stateWeeklyOrders}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default App;
