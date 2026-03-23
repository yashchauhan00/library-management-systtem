import React, { useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import api from "../../services/api";
import "./maintenance.css";

export default function MaintenancePage() {
  const [msg, setMsg] = useState("");
  const [membership, setMembership] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    durationMonths: 6
  });
  const [membershipUpdate, setMembershipUpdate] = useState({
    membershipNumber: "",
    action: "extend",
    extensionMonths: 6
  });
  const [book, setBook] = useState({
    mediaType: "book",
    title: "",
    author: "",
    category: "",
    serialNumber: "",
    availability: true
  });
  const [editBookId, setEditBookId] = useState("");
  const [user, setUser] = useState({
    mode: "new",
    name: "",
    username: "",
    password: "",
    role: "user",
    isActive: true
  });
  const [editUserId, setEditUserId] = useState("");

  const [membershipRows, setMembershipRows] = useState([]);
  const [bookRows, setBookRows] = useState([]);
  const [userRows, setUserRows] = useState([]);

  const loadData = async () => {
    try {
      const [members, books, users] = await Promise.all([
        api.get("/maintenance/memberships"),
        api.get("/maintenance/books"),
        api.get("/maintenance/users")
      ]);
      setMembershipRows(members.data);
      setBookRows(books.data);
      setUserRows(users.data);
    } catch (err) {
      setMsg("Failed to load lists");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addMembership = async (e) => {
    e.preventDefault();
    try {
      if (!membership.name || !membership.address || !membership.email || !membership.phone) {
        return setMsg("All membership fields are mandatory");
      }
      const { data } = await api.post("/maintenance/membership", membership);
      setMsg(`Membership created: ${data.membershipNumber}`);
      setMembership({ name: "", address: "", email: "", phone: "", durationMonths: 6 });
      loadData();
    } catch (err) {
      setMsg(err.response?.data?.message || "Membership save failed");
    }
  };

  const updateMembership = async (e) => {
    e.preventDefault();
    try {
      if (!membershipUpdate.membershipNumber) {
        return setMsg("Membership number is mandatory");
      }
      const { data } = await api.put(
        `/maintenance/membership/${membershipUpdate.membershipNumber}`,
        membershipUpdate
      );
      setMsg(`Membership updated. Status: ${data.status}`);
      loadData();
    } catch (err) {
      setMsg(err.response?.data?.message || "Membership update failed");
    }
  };

  const removeMembership = async (membershipNumber) => {
    try {
      await api.delete(`/maintenance/membership/${membershipNumber}`);
      setMsg("Membership deleted");
      loadData();
    } catch (err) {
      setMsg(err.response?.data?.message || "Delete failed");
    }
  };

  const saveBook = async (e) => {
    e.preventDefault();
    try {
      if (!book.title || !book.author || !book.category || !book.serialNumber) {
        return setMsg("All book fields are mandatory");
      }
      if (editBookId) {
        await api.put(`/maintenance/book/${editBookId}`, book);
        setMsg("Book updated");
      } else {
        await api.post("/maintenance/book", book);
        setMsg("Book saved");
      }
      setEditBookId("");
      setBook({
        mediaType: "book",
        title: "",
        author: "",
        category: "",
        serialNumber: "",
        availability: true
      });
      loadData();
    } catch (err) {
      setMsg(err.response?.data?.message || "Book save failed");
    }
  };

  const startEditBook = (row) => {
    setEditBookId(row._id);
    setBook({
      mediaType: row.mediaType,
      title: row.title,
      author: row.author,
      category: row.category,
      serialNumber: row.serialNumber,
      availability: row.availability
    });
  };

  const removeBook = async (id) => {
    try {
      await api.delete(`/maintenance/book/${id}`);
      setMsg("Book deleted");
      loadData();
    } catch (err) {
      setMsg(err.response?.data?.message || "Delete failed");
    }
  };

  const saveUser = async (e) => {
    e.preventDefault();
    try {
      if (!user.name || !user.username) {
        return setMsg("Name and username are mandatory");
      }
      if (editUserId) {
        await api.put(`/maintenance/user/${editUserId}`, user);
        setMsg("User updated");
      } else {
        await api.post("/maintenance/user", user);
        setMsg("User saved");
      }
      setEditUserId("");
      setUser({
        mode: "new",
        name: "",
        username: "",
        password: "",
        role: "user",
        isActive: true
      });
      loadData();
    } catch (err) {
      setMsg(err.response?.data?.message || "User save failed");
    }
  };

  const startEditUser = (row) => {
    setEditUserId(row._id);
    setUser({
      mode: "existing",
      name: row.name,
      username: row.username,
      password: "",
      role: row.role,
      isActive: row.isActive
    });
  };

  const removeUser = async (id) => {
    try {
      await api.delete(`/maintenance/user/${id}`);
      setMsg("User deleted");
      loadData();
    } catch (err) {
      setMsg(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="page">
      <NavBar />

      <div className="page-header">
        <h2>Maintenance (Admin Only)</h2>
      </div>

      {msg && <div className="alert">{msg}</div>}

      <div className="maintenance-grid">
        <form className="card" onSubmit={addMembership}>
          <h3>Add Membership</h3>
          <input value={membership.name} placeholder="Name" onChange={(e) => setMembership({ ...membership, name: e.target.value })} />
          <input value={membership.address} placeholder="Address" onChange={(e) => setMembership({ ...membership, address: e.target.value })} />
          <input value={membership.email} placeholder="Email" onChange={(e) => setMembership({ ...membership, email: e.target.value })} />
          <input value={membership.phone} placeholder="Phone" onChange={(e) => setMembership({ ...membership, phone: e.target.value })} />
          <select
            value={membership.durationMonths}
            onChange={(e) => setMembership({ ...membership, durationMonths: Number(e.target.value) })}
          >
            <option value={6}>6 months</option>
            <option value={12}>1 year</option>
            <option value={24}>2 years</option>
          </select>
          <button className="btn-primary">Save Membership</button>
        </form>

        <form className="card" onSubmit={updateMembership}>
          <h3>Update Membership</h3>
          <input
            value={membershipUpdate.membershipNumber}
            placeholder="Membership Number"
            onChange={(e) => setMembershipUpdate({ ...membershipUpdate, membershipNumber: e.target.value })}
          />
          <select value={membershipUpdate.action} onChange={(e) => setMembershipUpdate({ ...membershipUpdate, action: e.target.value })}>
            <option value="extend">Extend Membership</option>
            <option value="cancel">Cancel Membership</option>
          </select>
          <select
            value={membershipUpdate.extensionMonths}
            onChange={(e) => setMembershipUpdate({ ...membershipUpdate, extensionMonths: Number(e.target.value) })}
          >
            <option value={6}>6 months</option>
            <option value={12}>1 year</option>
            <option value={24}>2 years</option>
          </select>
          <button className="btn-primary">Update Membership</button>
        </form>

        <form className="card" onSubmit={saveBook}>
          <h3>Add / Update Book</h3>
          <div className="radio-group">
            <label>
              <input type="radio" checked={book.mediaType === "book"} onChange={() => setBook({ ...book, mediaType: "book" })} />
              Book
            </label>
            <label>
              <input type="radio" checked={book.mediaType === "movie"} onChange={() => setBook({ ...book, mediaType: "movie" })} />
              Movie
            </label>
          </div>
          <input value={book.title} placeholder="Title" onChange={(e) => setBook({ ...book, title: e.target.value })} />
          <input value={book.author} placeholder="Author" onChange={(e) => setBook({ ...book, author: e.target.value })} />
          <input value={book.category} placeholder="Category" onChange={(e) => setBook({ ...book, category: e.target.value })} />
          <input value={book.serialNumber} placeholder="Serial Number" onChange={(e) => setBook({ ...book, serialNumber: e.target.value })} />
          <label className="checkbox">
            <input type="checkbox" checked={book.availability} onChange={(e) => setBook({ ...book, availability: e.target.checked })} />
            Availability
          </label>
          <button className="btn-primary">{editBookId ? "Update Book" : "Save Book"}</button>
        </form>

        <form className="card" onSubmit={saveUser}>
          <h3>User Management</h3>
          <div className="radio-group">
            <label>
              <input type="radio" checked={user.mode === "new"} onChange={() => setUser({ ...user, mode: "new" })} />
              New User
            </label>
            <label>
              <input type="radio" checked={user.mode === "existing"} onChange={() => setUser({ ...user, mode: "existing" })} />
              Existing User
            </label>
          </div>
          <input value={user.name} placeholder="Name" onChange={(e) => setUser({ ...user, name: e.target.value })} />
          <input value={user.username} placeholder="Username" onChange={(e) => setUser({ ...user, username: e.target.value })} />
          <input type="password" placeholder="Password (skip to keep old)" onChange={(e) => setUser({ ...user, password: e.target.value })} />
          <select value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value })}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <label className="checkbox">
            <input type="checkbox" checked={user.isActive} onChange={(e) => setUser({ ...user, isActive: e.target.checked })} />
            Active
          </label>
          <button className="btn-primary">{editUserId ? "Update User" : "Save User"}</button>
        </form>
      </div>

      <div className="table-grid">
        <div className="card">
          <h3>Membership Table List</h3>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {membershipRows.map((m) => (
                <tr key={m._id}>
                  <td>{m.membershipNumber}</td>
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td>{m.phone}</td>
                  <td>{m.status}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => setMembershipUpdate({ ...membershipUpdate, membershipNumber: m.membershipNumber })}>Edit</button>
                    <button className="btn-danger" onClick={() => removeMembership(m.membershipNumber)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Book Table List</h3>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Author</th>
                <th>Category</th>
                <th>Serial</th>
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookRows.map((b) => (
                <tr key={b._id}>
                  <td>{b.mediaType}</td>
                  <td>{b.title}</td>
                  <td>{b.author}</td>
                  <td>{b.category}</td>
                  <td>{b.serialNumber}</td>
                  <td>{b.availability ? "Yes" : "No"}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => startEditBook(b)}>Edit</button>
                    <button className="btn-danger" onClick={() => removeBook(b._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card table-full">
          <h3>User Table List</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.username}</td>
                  <td>{u.role}</td>
                  <td>{u.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => startEditUser(u)}>Edit</button>
                    <button className="btn-danger" onClick={() => removeUser(u._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}