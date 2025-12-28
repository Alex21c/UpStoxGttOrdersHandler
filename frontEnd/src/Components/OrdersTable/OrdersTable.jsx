import "./ordersTable.css";
export default function OrdersTable({ orderType, ordersHeaderRow, orders }) {
  return (
    <>
      <h2>{orderType} Orders</h2>
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
