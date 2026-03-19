import { useMemo, useState } from "react";

function UserTransactionsFlow({ apiBase, token, onComplete }) {
  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [txStep, setTxStep] = useState("bookAvailable"); 

  const [searchType, setSearchType] = useState("book");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchAuthor, setSearchAuthor] = useState("");
  const [availableResults, setAvailableResults] = useState([]);

  const [selectedSerial, setSelectedSerial] = useState("");
  const [issueIssueDate, setIssueIssueDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [issueReturnDate, setIssueReturnDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [issueRemarks, setIssueRemarks] = useState("");

  const [returnTxList, setReturnTxList] = useState([]);
  const [selectedReturnTxId, setSelectedReturnTxId] = useState("");

  const [returnBookTitle, setReturnBookTitle] = useState("");
  const [returnBookAuthor, setReturnBookAuthor] = useState("");
  const [returnSerialNo, setReturnSerialNo] = useState("");
  const [returnIssueDate, setReturnIssueDate] = useState("");
  const [returnDueDate, setReturnDueDate] = useState("");
  const [returnReturnDate, setReturnReturnDate] = useState("");

  const [payFineTxId, setPayFineTxId] = useState("");
  const [payFineAmount, setPayFineAmount] = useState(0);
  const [payFinePaid, setPayFinePaid] = useState(false);
  const [payFineRemarks, setPayFineRemarks] = useState("");

  function setErrorSafe(msg) {
    setError(msg || "");
  }

  async function callJSON(url, options = {}) {
    setErrorSafe("");
    const r = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(options.headers || {}),
      },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.message || "Request failed");
    return data;
  }

  function todayISO() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }

  function dateISOToDate(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function dateToISO(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.toISOString().slice(0, 10);
  }

  async function searchAvailable() {
    try {
      setLoading(true);
      setErrorSafe("");
      if (!searchTitle.trim() && !searchAuthor.trim()) {
        setErrorSafe("Please enter Book Name or Author (one selection is required).");
        return;
      }
      const data = await callJSON(`${apiBase}/api/transactions/search-available-copies`, {
        method: "POST",
        body: JSON.stringify({
          type: searchType,
          title: searchTitle.trim() || null,
          authorName: searchAuthor.trim() || null,
        }),
      });
      setAvailableResults(data.results || []);
      setSelectedSerial("");
      setTxStep("searchAvailable");
      if (!((data.results || []).length)) setErrorSafe("No available books found for the given search.");
    } catch (e) {
      setErrorSafe(e.message);
    } finally {
      setLoading(false);
    }
  }

  function selectedResult() {
    return availableResults.find((x) => x.serialNo === selectedSerial) || null;
  }

  function validateIssueForm() {
    if (!selectedSerial) return "Please select one book from Search Results (radio).";
    const issue = dateISOToDate(issueIssueDate);
    const today = dateISOToDate(todayISO());
    if (issue < today) return "Issue Date cannot be less than today.";
    if (!issueReturnDate) return "Return Date is required.";
    const due = dateISOToDate(issueReturnDate);
    if (due < issue) return "Return Date cannot be earlier than Issue Date.";
    const maxDue = new Date(issue);
    maxDue.setDate(maxDue.getDate() + 15);
    if (due > maxDue) return "Return Date cannot be greater than 15 days ahead.";
    return "";
  }

  async function submitIssue() {
    try {
      setLoading(true);
      setErrorSafe("");
      const msg = validateIssueForm();
      if (msg) {
        setErrorSafe(msg);
        return;
      }

      const data = await callJSON(`${apiBase}/api/transactions/issue-by-serial`, {
        method: "POST",
        body: JSON.stringify({
          serialNo: selectedSerial,
          issueDate: issueIssueDate,
          returnDate: issueReturnDate,
          remarks: issueRemarks.trim() || "",
        }),
      });

      const resItem = selectedResult();
      setReturnTxList([]);
      setSelectedReturnTxId("");
      setSelectedSerial("");
      setIssueRemarks("");

      setTxStep("returnSelect");
      if (resItem) {
        await loadReturnCandidates();
      }
      if (data?.status) setErrorSafe("");
    } catch (e) {
      setErrorSafe(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadReturnCandidates() {
    const data = await callJSON(`${apiBase}/api/reports/active-issues`, { method: "GET" });
    const txs = data.transactions || [];
    
    setReturnTxList(
      txs
        .filter((t) => t.serialNo)
        .map((t) => ({
          transactionId: t._id,
          serialNo: t.serialNo,
          title: t.item?.title || "",
          authorName: t.authorName || t.item?.authorName || "",
          issueDate: t.issueDate ? new Date(t.issueDate).toISOString().slice(0, 10) : "",
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "",
        }))
    );
    return true;
  }

  async function loadReturnForm() {
    try {
      setLoading(true);
      setErrorSafe("");
      const tx = returnTxList.find((x) => x.transactionId === selectedReturnTxId);
      if (!tx) {
        setErrorSafe("Please select a book from the list (radio).");
        return;
      }
      setReturnBookTitle(tx.title);
      setReturnBookAuthor(tx.authorName);
      setReturnSerialNo(tx.serialNo);
      setReturnIssueDate(tx.issueDate);
      setReturnDueDate(tx.dueDate);
      setReturnReturnDate(tx.dueDate);
      setTxStep("returnForm");
    } catch (e) {
      setErrorSafe(e.message);
    } finally {
      setLoading(false);
    }
  }

  function validateReturnForm() {
    if (!returnBookTitle.trim()) return "Book Name is required.";
    if (!returnSerialNo.trim()) return "Serial No is mandatory.";
    if (!returnReturnDate) return "Return Date is required.";
    return "";
  }

  async function submitReturn() {
    try {
      setLoading(true);
      setErrorSafe("");
      const msg = validateReturnForm();
      if (msg) {
        setErrorSafe(msg);
        return;
      }

      const data = await callJSON(`${apiBase}/api/transactions/return-init`, {
        method: "POST",
        body: JSON.stringify({
          serialNo: returnSerialNo,
          returnDate: returnReturnDate,
        }),
      });

      setPayFineTxId(data.transactionId);
      setPayFineAmount(data.fineAmount ?? 0);
      setPayFinePaid(false);
      setPayFineRemarks("");
      setTxStep("payFine");
    } catch (e) {
      setErrorSafe(e.message);
    } finally {
      setLoading(false);
    }
  }

  function validatePayFine() {
    if ((payFineAmount ?? 0) > 0 && !payFinePaid) {
      return "Paid Fine checkbox must be selected to complete return for pending fine.";
    }
    return "";
  }

  async function confirmPayFine() {
    try {
      setLoading(true);
      setErrorSafe("");
      const msg = validatePayFine();
      if (msg) {
        setErrorSafe(msg);
        return;
      }

      await callJSON(`${apiBase}/api/transactions/pay-fine`, {
        method: "POST",
        body: JSON.stringify({
          transactionId: payFineTxId,
          finePaid: payFineAmount > 0 ? payFinePaid : true,
          remarks: payFineRemarks.trim() || "",
        }),
      });

      if (typeof onComplete === "function") onComplete();
      else setTxStep("bookAvailable");
    } catch (e) {
      setErrorSafe(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 1000, margin: "0 auto" }}>
      <div className="menu-buttons">
        <button type="button" onClick={() => { setTxStep("bookAvailable"); setErrorSafe(""); }}>
          Book Availability
        </button>
      </div>

      {error ? <p style={{ color: "crimson", margin: "12px 0" }}>{error}</p> : null}
      {loading ? <p>Loading...</p> : null}

      {txStep === "bookAvailable" ? (
        <>
          <div className="input-group" style={{ maxWidth: 600, margin: "20px auto 0", textAlign: "left" }}>
            <label>Book/Movie Type</label>
            <select value={searchType} onChange={(e) => setSearchType(e.target.value)}>
              <option value="book">book</option>
              <option value="movie">movie</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <div className="input-group" style={{ width: 320, marginTop: 16 }}>
              <label>Enter Book Name (textbox)</label>
              <input value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)} />
            </div>
            <div className="input-group" style={{ width: 320, marginTop: 16 }}>
              <label>Author Name (dropdown/text)</label>
              <input value={searchAuthor} onChange={(e) => setSearchAuthor(e.target.value)} />
            </div>
          </div>

          <div className="menu-buttons" style={{ justifyContent: "center" }}>
            <button type="button" onClick={searchAvailable}>Search</button>
          </div>
        </>
      ) : null}

      {txStep === "searchAvailable" ? (
        <>
          <h3 className="product-title">Search Results</h3>
          <table className="product-table">
            <thead>
              <tr>
                <th>Book Name</th>
                <th>Author Name</th>
                <th>Serial Number</th>
                <th>Available</th>
                <th>Select</th>
              </tr>
            </thead>
            <tbody>
              {availableResults.map((r) => (
                <tr key={r.serialNo}>
                  <td>{r.title}</td>
                  <td>{r.authorName || "-"}</td>
                  <td>{r.serialNo}</td>
                  <td>{r.available ? "Y" : "N"}</td>
                  <td>
                    <input
                      type="radio"
                      name="serial"
                      checked={selectedSerial === r.serialNo}
                      onChange={() => setSelectedSerial(r.serialNo)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="menu-buttons" style={{ justifyContent: "center" }}>
            <button type="button" onClick={submitIssue}>Issue Book</button>
            <button type="button" onClick={() => setTxStep("returnSelect")}>Return Book</button>
          </div>
        </>
      ) : null}

      {txStep === "issue" ? null : null}

      {txStep === "returnSelect" ? (
        <>
          <h3 className="product-title">Select Book to Return</h3>
          <div className="menu-buttons" style={{ justifyContent: "center" }}>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                setErrorSafe("");
                try {
                  await loadReturnCandidates();
                } catch (e) {
                  setErrorSafe(e.message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Load Active Issues
            </button>
          </div>

          <table className="product-table">
            <thead>
              <tr>
                <th>Book Name</th>
                <th>Author Name</th>
                <th>Serial No</th>
                <th>Issue Date</th>
                <th>Return Due Date</th>
                <th>Select</th>
              </tr>
            </thead>
            <tbody>
              {returnTxList.map((r) => (
                <tr key={r.transactionId}>
                  <td>{r.title}</td>
                  <td>{r.authorName || "-"}</td>
                  <td>{r.serialNo}</td>
                  <td>{r.issueDate}</td>
                  <td>{r.dueDate}</td>
                  <td>
                    <input
                      type="radio"
                      name="returnTx"
                      checked={selectedReturnTxId === r.transactionId}
                      onChange={() => setSelectedReturnTxId(r.transactionId)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="menu-buttons" style={{ justifyContent: "center" }}>
            <button type="button" onClick={loadReturnForm}>Return Book</button>
            <button type="button" onClick={() => setTxStep("bookAvailable")}>Back</button>
          </div>
        </>
      ) : null}

      {txStep === "returnForm" ? (
        <>
          <h3 className="product-title">Return Book</h3>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <div className="input-group" style={{ width: 320, marginTop: 16, textAlign: "left" }}>
              <label>Name of Book (required)</label>
              <input value={returnBookTitle} readOnly />
            </div>
            <div className="input-group" style={{ width: 320, marginTop: 16, textAlign: "left" }}>
              <label>Author Name</label>
              <input value={returnBookAuthor} readOnly />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <div className="input-group" style={{ width: 320, marginTop: 16, textAlign: "left" }}>
              <label>Serial No (mandatory)</label>
              <input value={returnSerialNo} readOnly />
            </div>
            <div className="input-group" style={{ width: 320, marginTop: 16, textAlign: "left" }}>
              <label>Issue Date</label>
              <input value={returnIssueDate} readOnly />
            </div>
          </div>

          <div className="input-group" style={{ maxWidth: 600, margin: "20px auto 0", textAlign: "left" }}>
            <label>Return Date</label>
            <input type="date" value={returnReturnDate} onChange={(e) => setReturnReturnDate(e.target.value)} />
          </div>

          <div className="menu-buttons" style={{ justifyContent: "center" }}>
            <button type="button" onClick={submitReturn}>Confirm</button>
            <button type="button" onClick={() => setTxStep("returnSelect")}>Back</button>
          </div>
        </>
      ) : null}

      {txStep === "payFine" ? (
        <>
          <h3 className="product-title">Fine Pay</h3>
          <table className="product-table">
            <tbody>
              <tr>
                <td>Book Name</td>
                <td>{returnBookTitle}</td>
              </tr>
              <tr>
                <td>Author Name</td>
                <td>{returnBookAuthor}</td>
              </tr>
              <tr>
                <td>Serial No</td>
                <td>{returnSerialNo}</td>
              </tr>
              <tr>
                <td>Issue Date</td>
                <td>{returnIssueDate}</td>
              </tr>
              <tr>
                <td>Return Due Date</td>
                <td>{returnDueDate}</td>
              </tr>
              <tr>
                <td>Return Date</td>
                <td>{returnReturnDate}</td>
              </tr>
              <tr>
                <td>Calculated Fine</td>
                <td>{payFineAmount}</td>
              </tr>
            </tbody>
          </table>

          <div className="input-group" style={{ maxWidth: 600, margin: "20px auto 0", textAlign: "left" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={payFinePaid} onChange={(e) => setPayFinePaid(e.target.checked)} />
              Fine Paid
            </label>
          </div>

          <div className="input-group" style={{ maxWidth: 600, margin: "10px auto 0", textAlign: "left" }}>
            <label>Remarks (optional)</label>
            <textarea value={payFineRemarks} onChange={(e) => setPayFineRemarks(e.target.value)} rows={3} />
          </div>

          <div className="menu-buttons" style={{ justifyContent: "center" }}>
            <button type="button" onClick={confirmPayFine}>Confirm</button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default UserTransactionsFlow;

