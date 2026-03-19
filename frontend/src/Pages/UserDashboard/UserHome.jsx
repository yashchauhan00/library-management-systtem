import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./userhome.css";
import UserTransactionsFlow from "./UserTransactionsFlow";

function UserHome({ defaultSection } = {}) {

  const navigate = useNavigate();
  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE_URL || "http://localhost:5000", []);

  const token = localStorage.getItem("token");

  const [section, setSection] = useState(defaultSection || "reports"); 
  const [reportView, setReportView] = useState("activeIssues"); 
  const [txView, setTxView] = useState("check"); 

  const [itemCode, setItemCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeIssues, setActiveIssues] = useState([]);
  const [masterMembers, setMasterMembers] = useState([]);
  const [masterBooks, setMasterBooks] = useState([]);
  const [masterMovies, setMasterMovies] = useState([]);
  const [overdue, setOverdue] = useState({ returnedLate: [], activeOverdue: [] });
  const [pendingRequests, setPendingRequests] = useState([]);

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
        body: JSON.stringify({ itemCode }),
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
        body: JSON.stringify({ itemCode }),
      });
      if (data.status === "issued") {
        alert(`Issued. Due date: ${new Date(data.dueDate).toLocaleDateString()}`);
      } else {
        alert(`Request pending. RequestId: ${data.requestId}`);
      }
      await loadActiveIssues();
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
        body: JSON.stringify({ itemCode }),
      });
      alert(`Returned. Fine: ${data.fineAmount} (Late days: ${data.lateDays})`);
      await loadActiveIssues();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  }

return(

<div className="user-container">

<h2>User Home Page</h2>

<div className="menu-buttons">
<button type="button" onClick={() => setSection("reports")}>Reports</button>
<button type="button" onClick={() => setSection("transactions")}>Transactions</button>
</div>

{section === "reports" ? (
<>
<div className="menu-buttons">
<button type="button" onClick={() => { setReportView("activeIssues"); loadActiveIssues(); }}>Active Issues</button>
<button type="button" onClick={() => { setReportView("master"); loadMaster(); }}>Master List</button>
<button type="button" onClick={() => { setReportView("overdue"); loadOverdue(); }}>Overdue Returns</button>
<button type="button" onClick={() => { setReportView("pending"); loadPendingRequests(); }}>Pending Requests</button>
</div>

{reportView === "activeIssues" ? (
<div>
<h3 className="product-title">Active Issues</h3>
<table className="product-table">
<thead>
<tr>
<th>User</th>
<th>Item</th>
<th>Issue Date</th>
<th>Due Date</th>
</tr>
</thead>
<tbody>
{activeIssues.map((t) => (
<tr key={t._id}>
<td>{t.user?.userId}</td>
<td>{t.item?.title}</td>
<td>{t.issueDate ? new Date(t.issueDate).toLocaleDateString() : "-"}</td>
<td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}</td>
</tr>
))}
</tbody>
</table>
</div>
) : null}

{reportView === "master" ? (
<div>
<h3 className="product-title">Members</h3>
<table className="product-table">
<thead>
<tr>
<th>User ID</th>
<th>Name</th>
<th>Membership</th>
</tr>
</thead>
<tbody>
{masterMembers.map((m) => (
<tr key={m._id}>
<td>{m.userId}</td>
<td>{m.name}</td>
<td>{m.membership?.membershipCode || "-"}</td>
</tr>
))}
</tbody>
</table>

<h3 className="product-title">Books</h3>
<table className="product-table">
<thead>
<tr>
<th>Item Code</th>
<th>Title</th>
<th>Category</th>
<th>Available</th>
</tr>
</thead>
<tbody>
{masterBooks.map((b) => (
<tr key={b._id}>
<td>{b.itemCode}</td>
<td>{b.title}</td>
<td>{b.category}</td>
<td>{b.availableCopies}</td>
</tr>
))}
</tbody>
</table>

<h3 className="product-title">Movies</h3>
<table className="product-table">
<thead>
<tr>
<th>Item Code</th>
<th>Title</th>
<th>Category</th>
<th>Available</th>
</tr>
</thead>
<tbody>
{masterMovies.map((m) => (
<tr key={m._id}>
<td>{m.itemCode}</td>
<td>{m.title}</td>
<td>{m.category}</td>
<td>{m.availableCopies}</td>
</tr>
))}
</tbody>
</table>
</div>
) : null}

{reportView === "overdue" ? (
<div>
<h3 className="product-title">Returned Late</h3>
<table className="product-table">
<thead>
<tr>
<th>User</th>
<th>Item</th>
<th>Due Date</th>
<th>Return Date</th>
<th>Late Days</th>
<th>Fine</th>
</tr>
</thead>
<tbody>
{(overdue.returnedLate || []).map((t) => (
<tr key={t._id}>
<td>{t.user?.userId}</td>
<td>{t.item?.title}</td>
<td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}</td>
<td>{t.returnDate ? new Date(t.returnDate).toLocaleDateString() : "-"}</td>
<td>{t.lateDays}</td>
<td>{t.fineAmount}</td>
</tr>
))}
</tbody>
</table>
</div>
) : null}

{reportView === "pending" ? (
<div>
<h3 className="product-title">Pending Issue Requests</h3>
<table className="product-table">
<thead>
<tr>
<th>User</th>
<th>Item</th>
<th>Requested At</th>
</tr>
</thead>
<tbody>
{pendingRequests.map((r) => (
<tr key={r._id}>
<td>{r.user?.userId}</td>
<td>{r.item?.title}</td>
<td>{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : "-"}</td>
</tr>
))}
</tbody>
</table>
</div>
) : null}
</>
) : (
<UserTransactionsFlow
  apiBase={apiBase}
  token={token}
  onComplete={() => {
    setSection("reports");
    setReportView("activeIssues");
    loadActiveIssues();
  }}
/>
)}

<button className="logout-btn" type="button" onClick={logout}>Log Out</button>

</div>

)

}

export default UserHome