import React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/NavBar";
import api from "../../services/api";

export default function UserDashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/transactions/issues").then((res) => setRows(res.data.slice(0, 5)));
  }, []);

  return (
    <div className="page">
      <NavBar />
      <h1>User Dashboard</h1>
      <p>User can access reports and transactions.</p>

      <div className="maintenance-grid">
        <div className="card" onClick={()=>navigate("/transactions")}>
          <h3>Transactions</h3>
          <p>Issue Book, Return Book and Pay Fine.</p>
        </div>

        <div className="card" onClick={()=>navigate("/reports")}>
          <h3>Reports</h3>
          <p>View Active Issues, Overdue Books and Master Lists.</p>
        </div>
      </div>

      <div className="card table-full">
        <h3>Latest Transactions</h3>
        <table>
          <thead>
            <tr><th>Book</th><th>Member</th><th>Status</th><th>Issue Date</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.book?.title}</td>
                <td>{r.member?.membershipNumber}</td>
                <td>{r.status}</td>
                <td>{r.issueDate?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}