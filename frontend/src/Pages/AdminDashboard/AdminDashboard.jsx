import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDasboard.css";
import UserHome from "../UserDashboard/UserHome";

function AdminHome() {

  const navigate = useNavigate();
  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE_URL || "http://localhost:5000", []);
  const token = localStorage.getItem("token");

  const [section, setSection] = useState("maintenance");
  const [maintView, setMaintView] = useState("memberships");
  const [reportView, setReportView] = useState("activeIssues");
  const [txView, setTxView] = useState("check");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Maintenance forms
  const [membershipCode, setMembershipCode] = useState("");
  const [mName, setMName] = useState("");
  const [borrowDurationDays, setBorrowDurationDays] = useState(7);
  const [finePerDay, setFinePerDay] = useState(5);
  const [maxBorrowLimit, setMaxBorrowLimit] = useState(5);

  const [itemCode, setItemCode] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [itemType, setItemType] = useState("book");
  const [totalCopies, setTotalCopies] = useState(1);
  const [availableCopies, setAvailableCopies] = useState(1);

  const [userId, setUserId] = useState("");
  const [uName, setUName] = useState("");
  const [password, setPassword] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [membershipCodeForUser, setMembershipCodeForUser] = useState("DEFAULT");

  // Reports data
  const [activeIssues, setActiveIssues] = useState([]);
  const [masterMembers, setMasterMembers] = useState([]);
  const [masterBooks, setMasterBooks] = useState([]);
  const [masterMovies, setMasterMovies] = useState([]);
  const [overdue, setOverdue] = useState({ returnedLate: [], activeOverdue: [] });
  const [pendingRequests, setPendingRequests] = useState([]);

  // Transactions
  const [txItemCode, setTxItemCode] = useState("");

  function authHeaders() {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function callJSON(url, options = {}) {
    const r = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.message || "Request failed");
    return data;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  }

  
  async function saveMembership() {
    setLoading(true);
    setError("");
    try {
      if (!membershipCode || !mName) throw new Error("membershipCode and name are required");
      await callJSON(`${apiBase}/api/admin/memberships/${membershipCode}`, {
        method: "PUT",
        body: JSON.stringify({
          membershipCode,
          name: mName,
          borrowDurationDays: Number(borrowDurationDays),
          finePerDay: Number(finePerDay),
          maxBorrowLimit: Number(maxBorrowLimit),
        }),
      });
      alert("Membership saved");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveItem() {
    setLoading(true);
    setError("");
    try {
      if (!itemCode || !title || !category) throw new Error("itemCode, title, category are required");
      await callJSON(`${apiBase}/api/admin/items/${itemCode}`, {
        method: "PUT",
        body: JSON.stringify({
          itemCode,
          title,
          category,
          itemType,
          totalCopies: Number(totalCopies),
          availableCopies: Number(availableCopies),
        }),
      });
      alert("Item saved");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveUser() {
    setLoading(true);
    setError("");
    try {
      if (!userId || !uName || !password) throw new Error("userId, name, password are required");
      await callJSON(`${apiBase}/api/admin/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({
          userId,
          name: uName,
          password,
          role: userRole,
          membershipCode: membershipCodeForUser,
          status: "active",
        }),
      });
      alert("User saved");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadActiveIssues() {
    setLoading(true);
    setError("");
    try {
      const data = await callJSON(`${apiBase}/api/reports/active-issues`, { method: "GET" });
      setActiveIssues(data.transactions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMaster() {
    setLoading(true);
    setError("");
    try {
      const membersData = await callJSON(`${apiBase}/api/reports/master/members`, { method: "GET" });
      const booksData = await callJSON(`${apiBase}/api/reports/master/items?type=book`, { method: "GET" });
      const moviesData = await callJSON(`${apiBase}/api/reports/master/items?type=movie`, { method: "GET" });
      setMasterMembers(membersData.users || []);
      setMasterBooks(booksData.items || []);
      setMasterMovies(moviesData.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadOverdue() {
    setLoading(true);
    setError("");
    try {
      const data = await callJSON(`${apiBase}/api/reports/overdue-returns`, { method: "GET" });
      setOverdue(data || { returnedLate: [], activeOverdue: [] });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingRequests() {
    setLoading(true);
    setError("");
    try {
      const data = await callJSON(`${apiBase}/api/reports/pending-issue-requests`, { method: "GET" });
      setPendingRequests(data.requests || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }


  async function checkAvailability() {
    setLoading(true);
    setError("");
    try {
      const data = await callJSON(`${apiBase}/api/transactions/check-availability`, {
        method: "POST",
        body: JSON.stringify({ itemCode: txItemCode }),
      });
      alert(`Available copies for ${data.title}: ${data.availableCopies}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function issueItem() {
    setLoading(true);
    setError("");
    try {
      const data = await callJSON(`${apiBase}/api/transactions/issue`, {
        method: "POST",
        body: JSON.stringify({ itemCode: txItemCode }),
      });
      if (data.status === "issued") alert(`Issued. Due date: ${new Date(data.dueDate).toLocaleDateString()}`);
      else alert(`Request pending. RequestId: ${data.requestId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function returnItem() {
    setLoading(true);
    setError("");
    try {
      const data = await callJSON(`${apiBase}/api/transactions/return`, {
        method: "POST",
        body: JSON.stringify({ itemCode: txItemCode }),
      });
      alert(`Returned. Fine: ${data.fineAmount} (Late days: ${data.lateDays})`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return(

<div className="container">

<h2>Admin Home Page</h2>

<div className="menu">
<button type="button" onClick={() => setSection("maintenance")}>Maintenance</button>
<button type="button" onClick={() => setSection("reports")}>Reports</button>
<button type="button" onClick={() => setSection("transactions")}>Transactions</button>
</div>

{section === "maintenance" ? (
<>
<h3>Maintenance</h3>
<div className="menu">
<button type="button" onClick={() => setMaintView("memberships")}>Memberships</button>
<button type="button" onClick={() => setMaintView("items")}>Books/Movies</button>
<button type="button" onClick={() => setMaintView("users")}>Users</button>
</div>

{maintView === "memberships" ? (
<div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
<input placeholder="membershipCode" value={membershipCode} onChange={(e) => setMembershipCode(e.target.value)} />
<input placeholder="name" value={mName} onChange={(e) => setMName(e.target.value)} />
<input type="number" placeholder="borrowDurationDays" value={borrowDurationDays} onChange={(e) => setBorrowDurationDays(e.target.value)} />
<input type="number" placeholder="finePerDay" value={finePerDay} onChange={(e) => setFinePerDay(e.target.value)} />
<input type="number" placeholder="maxBorrowLimit" value={maxBorrowLimit} onChange={(e) => setMaxBorrowLimit(e.target.value)} />
<button type="button" onClick={saveMembership}>Save Membership</button>
</div>
) : null}

{maintView === "items" ? (
<div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
<input placeholder="itemCode" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
<input placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} />
<input placeholder="category" value={category} onChange={(e) => setCategory(e.target.value)} />
<select value={itemType} onChange={(e) => setItemType(e.target.value)}>
<option value="book">book</option>
<option value="movie">movie</option>
</select>
<input type="number" placeholder="totalCopies" value={totalCopies} onChange={(e) => setTotalCopies(e.target.value)} />
<input type="number" placeholder="availableCopies" value={availableCopies} onChange={(e) => setAvailableCopies(e.target.value)} />
<button type="button" onClick={saveItem}>Save Item</button>
</div>
) : null}

{maintView === "users" ? (
<div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
<input placeholder="userId" value={userId} onChange={(e) => setUserId(e.target.value)} />
<input placeholder="name" value={uName} onChange={(e) => setUName(e.target.value)} />
<input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
<select value={userRole} onChange={(e) => setUserRole(e.target.value)}>
<option value="user">user</option>
<option value="admin">admin</option>
</select>
<input placeholder="membershipCode" value={membershipCodeForUser} onChange={(e) => setMembershipCodeForUser(e.target.value)} />
<button type="button" onClick={saveUser}>Save User</button>
</div>
) : null}
</>
) : (
<UserHome defaultSection={section === "transactions" ? "transactions" : "reports"} />
)}

<button className="logout" type="button" onClick={logout}>Log Out</button>

</div>

)

}

export default AdminHome