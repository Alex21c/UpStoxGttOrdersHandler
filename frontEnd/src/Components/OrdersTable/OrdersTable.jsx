import { useState } from "react";
import urls from "../../urls.mjs";
import "./ordersTable.css";
export default function OrdersTable({ orderType, ordersHeaderRow, orders, isPlacingOrCancellingOrder, setIsPlacingOrCancellingOrder, setStateLoggerData }) {
  function updateLogger(msg = null) {
    if (msg == null) {
      return;
    }
    setStateLoggerData((prevState) => [...prevState, msg]);
  }

  async function placeIntradayOrders() {
    try {
      setIsPlacingOrCancellingOrder(true);
      updateLogger("placing intraday gtt orders");
      let response = await fetch(urls?.placeIntradayGttOrdersOnUpstox);
      response = await response.json();
      if (response.success) {
        updateLogger(response?.apiData?.message.join("\n"));
      }
    } catch (error) {
      updateLogger(`Error: ${error.message}`);
    } finally {
      setIsPlacingOrCancellingOrder(false);
    }
  }

  async function placeWeeklyOrders() {
    try {
      updateLogger("placing weekly delivery gtt orders");
      setIsPlacingOrCancellingOrder(true);
      let response = await fetch(urls?.placeWeeklyDeliveryGttOrdersOnUpstox);
      response = await response.json();
      if (response.success) {
        updateLogger(response?.apiData?.message.join("\n"));
      }
    } catch (error) {
      updateLogger(`Error: ${error.message}`);
    } finally {
      setIsPlacingOrCancellingOrder(false);
    }
  }
  async function cancelAllIntradayOrders() {
    try {
      updateLogger("cancelling all intraday gtt orders");
      setIsPlacingOrCancellingOrder(true);
      let response = await fetch(urls?.cancelAllIntradayGttOrdersOnUpstox);
      response = await response.json();
      if (response.success) {
        const successfullyCancelledOrders = response?.apiData?.successfullyCancelledOrders;
        // console.log(successfullyCancelledOrders);
        const failedToCancelledOrders = response?.apiData?.failedToCancelledOrders;
        if (successfullyCancelledOrders?.length > 0) {
          updateLogger(`successfullyCancelledOrders : ${successfullyCancelledOrders.join(", ")}`);
        }
        if (failedToCancelledOrders?.length > 0) {
          updateLogger(`failedToCancelledOrders :  ${failedToCancelledOrders.join(", ")}`);
        }
      } else {
        if (response.message) {
          updateLogger(response.message);
        }
      }
    } catch (error) {
      console.log(error);
      updateLogger(`Error: ${error.message}`);
    } finally {
      setIsPlacingOrCancellingOrder(false);
    }
  }
  async function cancelAllWeeklyOrders() {
    try {
      updateLogger("cancelling all weekly delivery GTT orders");
      setIsPlacingOrCancellingOrder(true);
      let response = await fetch(urls?.cancelAllWeeklyDeliveryGttOrdersOnUpstox);
      response = await response.json();
      if (response.success) {
        const successfullyCancelledOrders = response?.apiData?.successfullyCancelledOrders;

        const failedToCancelledOrders = response?.apiData?.failedToCancelledOrders;
        if (successfullyCancelledOrders?.length > 0) {
          updateLogger(`successfullyCancelledOrders : ${successfullyCancelledOrders.join(", ")}`);
        }
        if (failedToCancelledOrders?.length > 0) {
          updateLogger(`failedToCancelledOrders :  ${failedToCancelledOrders.join(", ")}`);
        }
      } else {
        if (response.message) {
          updateLogger(response.message);
        }
      }
    } catch (error) {
      updateLogger(`Error: ${error.message}`);
    } finally {
      setIsPlacingOrCancellingOrder(false);
    }
  }

  return (
    <>
      <h2>{orderType} Orders</h2>
      <div className="orderButtons">
        <button disabled={isPlacingOrCancellingOrder} className={`btn ${isPlacingOrCancellingOrder ? "disabled" : ""}`} onClick={orderType == "INTRADAY" ? placeIntradayOrders : placeWeeklyOrders}>
          Place {orderType} Orders
        </button>
        <button disabled={isPlacingOrCancellingOrder} className={`btn ${isPlacingOrCancellingOrder ? "disabled" : ""}`} onClick={orderType == "INTRADAY" ? cancelAllIntradayOrders : cancelAllWeeklyOrders}>
          Cancel All {orderType} Orders
        </button>
      </div>
      <table className="ordersTable">
        <thead>
          <tr>
            {ordersHeaderRow &&
              ordersHeaderRow.map((headerKey, idx) => {
                //console.log(idx);
                // console.log("headerKey is : ", headerKey);
                return (
                  <th key={idx} className={idx == 9 || idx == 10 || idx == 11 || idx == 12 ? "orange" : ""}>
                    {headerKey}
                  </th>
                );
              })}
          </tr>
        </thead>

        <tbody>
          {orders &&
            orders.map((arr, idx) => {
              //console.log(idx);
              //console.log("Array is : ", arr);

              return (
                <tr key={arr[1] + idx}>
                  {arr.map((data, idx) => {
                    // console.log("data is ", data);
                    return (
                      <td key={idx} className={idx == 9 || idx == 10 || idx == 11 || idx == 12 ? "orange" : ""}>
                        {data}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
        </tbody>
      </table>
    </>
  );
}
