import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./NavBar.css";

export default function NavBar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <nav className="navbar">

      <div className="nav-left">
        <h2 className="logo">Library System</h2>

        {user?.role === "admin" && <Link to="/admin">Admin</Link>}
        <Link to="/user">User</Link>

        {user?.role === "admin" && <Link to="/maintenance">Maintenance</Link>}

        <Link to="/transactions">Transactions</Link>
        <Link to="/reports">Reports</Link>

        <a href="#chart">Chart</a>
      </div>

      <div className="nav-right">
        <span className="username">{user?.name || ""}</span>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>

    </nav>
  );
}