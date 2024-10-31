import React from "react";

const TableComponent = ({ data }) => {
  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(data).map((val, i) => (
            <tr key={i}>
              <td>{val.toUpperCase()}</td>
              <td>{data[val]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableComponent;
