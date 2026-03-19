import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login(){

const navigate = useNavigate();

const [userId,setUserId] = useState("");
const [password,setPassword] = useState("");
const [error,setError] = useState("");

const apiBase = useMemo(() => {
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
}, []);

const handleLogin = ()=>{

  setError("");
  fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, password }),
  })
    .then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || "Login failed");
      return data;
    })
    .then((data) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      if (data.role === "admin") navigate("/admin");
      else navigate("/user");
    })
    .catch((e) => setError(e.message));

}

return(

<div className="login-container">

<h2>Library Management System</h2>

<div className="input-group">
<label>User ID</label>
<input onChange={(e)=>setUserId(e.target.value)} />
</div>

<div className="input-group">
<label>Password</label>
<input type="password" onChange={(e)=>setPassword(e.target.value)} />
</div>

{error ? <p style={{ color: "crimson", marginTop: 10 }}>{error}</p> : null}

<div className="button-group">
<button className="cancel-btn">Cancel</button>
<button className="login-btn" onClick={handleLogin}>Login</button>
</div>

</div>

)

}

export default Login