import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/Loginpage/LoginPage";
import AdminDashboard from "./pages/AdminDashboard/AdminDashboard";
import UserDashboard from "./pages/UserDashboard/UserDashboard";
import MaintenancePage from "./pages/MaintenacePage/MaintenancePage";
import TransactionsPage from "./pages/TransactionPage/TransactionsPage";
import ReportsPage from "./pages/ReportsPage/ReportsPage";

const Guard = ({ children, role }) => {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) return <Navigate to="/" />;

  if (role && user.role !== role)
    return <Navigate to={user.role === "admin" ? "/admin" : "/user"} />;

  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/admin" element={<Guard role="admin"><AdminDashboard /></Guard>} />
      <Route path="/user" element={<Guard><UserDashboard /></Guard>} />
      <Route path="/maintenance" element={<Guard role="admin"><MaintenancePage /></Guard>} />
      <Route path="/transactions" element={<Guard><TransactionsPage /></Guard>} />
      <Route path="/reports" element={<Guard><ReportsPage /></Guard>} />
    </Routes>
  );
}