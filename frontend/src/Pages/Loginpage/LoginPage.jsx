import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loginType, setLoginType] = useState("user");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username || !form.password) {
      setError("Username and password are required");
      return;
    }
    try {
      const { data } = await api.post("/auth/login", form);
      if (data.user.role !== loginType) {
        setError(
          loginType === "admin"
            ? "Yeh admin account nahi hai. User login select karo."
            : "Yeh user account nahi hai. Admin login select karo."
        );
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(loginType === "admin" ? "/admin" : "/user");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="page">
      <h2>Library Login</h2>
      <form onSubmit={onSubmit} className="card">
        <div className="login-type-row">
          <button
            type="button"
            className={loginType === "user" ? "type-btn active" : "type-btn"}
            onClick={() => setLoginType("user")}
          >
            User Login
          </button>
          <button
            type="button"
            className={loginType === "admin" ? "type-btn active" : "type-btn"}
            onClick={() => setLoginType("admin")}
          >
            Admin Login
          </button>
        </div>
        <input
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
