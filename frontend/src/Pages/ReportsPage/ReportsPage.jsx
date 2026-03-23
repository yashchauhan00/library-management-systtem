import React from "react";
import { useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import api from "../../services/api";

const tables = [
  { key: "active-issues", title: "Active Issues" },
  { key: "overdue-returns", title: "Overdue Returns" },
  { key: "pending-issue-requests", title: "Pending Issue Requests" },
  { key: "master-books", title: "Master List of Books" },
  { key: "memberships", title: "Membership List" }
];

export default function ReportsPage() {
  const [selected, setSelected] = useState("active-issues");
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  const loadRows = () => {
    api
      .get(`/reports/${selected}`)
      .then((res) => {
        setRows(res.data);
        setMsg(`Loaded ${res.data.length} rows`);
      })
      .catch(() => setMsg("Report load failed"));
  };

  useEffect(() => {
    loadRows();
  }, [selected]);

  const renderTable = () => {
    if (selected === "master-books") {
      return (
        <table>
          <thead><tr><th>Type</th><th>Title</th><th>Author</th><th>Category</th><th>Serial</th><th>Available</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r._id}><td>{r.mediaType}</td><td>{r.title}</td><td>{r.author}</td><td>{r.category}</td><td>{r.serialNumber}</td><td>{r.availability ? "Yes" : "No"}</td></tr>)}</tbody>
        </table>
      );
    }
    if (selected === "memberships") {
      return (
        <table>
          <thead><tr><th>No</th><th>Name</th><th>Email</th><th>Phone</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r._id}><td>{r.membershipNumber}</td><td>{r.name}</td><td>{r.email}</td><td>{r.phone}</td><td>{r.status}</td></tr>)}</tbody>
        </table>
      );
    }
    return (
      <table>
        <thead><tr><th>Id</th><th>Book</th><th>Member</th><th>Issue Date</th><th>Return Date</th><th>Status</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r._id}><td>{r._id}</td><td>{r.book?.title}</td><td>{r.member?.membershipNumber}</td><td>{r.issueDate?.slice(0, 10)}</td><td>{r.returnDate?.slice(0, 10)}</td><td>{r.status}</td></tr>)}</tbody>
      </table>
    );
  };

  return (
    <div className="page">
      <NavBar />
      <h2>Reports</h2>
      {msg && <p className="error">{msg}</p>}
      <select value={selected} onChange={(e) => setSelected(e.target.value)}>
        {tables.map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
      </select>
      <button style={{ marginLeft: "8px" }} onClick={loadRows}>Refresh</button>
      <div className="card">
        {renderTable()}
      </div>
    </div>
  );
}
