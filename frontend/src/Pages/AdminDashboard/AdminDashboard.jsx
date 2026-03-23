import React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../../components/NavBar";
import api from "../../services/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ members: 0, books: 0, users: 0, issues: 0 });

  useEffect(() => {
    Promise.all([
      api.get("/maintenance/memberships"),
      api.get("/maintenance/books"),
      api.get("/maintenance/users"),
      api.get("/transactions/issues")
    ]).then(([m, b, u, t]) => {
      setStats({
        members: m.data.length,
        books: b.data.length,
        users: u.data.length,
        issues: t.data.length
      });
    });
  }, []);

  return (
    <div className="page">
      <NavBar />
      <h2>Admin Dashboard</h2>
      <p>Admin can access maintenance, reports and transactions.</p>
      <div className="maintenance-grid">
        <div className="card"><h3>Total Memberships</h3><p>{stats.members}</p><Link to="/maintenance">Manage</Link></div>
        <div className="card"><h3>Total Books</h3><p>{stats.books}</p><Link to="/maintenance">Manage</Link></div>
        <div className="card"><h3>Total Users</h3><p>{stats.users}</p><Link to="/maintenance">Manage</Link></div>
        <div className="card"><h3>Total Transactions</h3><p>{stats.issues}</p><Link to="/transactions">Open</Link></div>
      </div>
    </div>
  );
}
