import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./Pages/LoginPage/Login";
import AdminDashboard from "./Pages/AdminDashboard/AdminDashboard";
import UserDashboard from "./Pages/UserDashboard/UserHome";
import RequireAuth from "./components/RequireAuth";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Login />} />

        <Route
          path="/admin"
          element={
            <RequireAuth allowedRoles={["admin"]}>
              <AdminDashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/user"
          element={
            <RequireAuth allowedRoles={["user", "admin"]}>
              <UserDashboard />
            </RequireAuth>
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;