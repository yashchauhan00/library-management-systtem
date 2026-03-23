import React, { useEffect, useMemo, useState } from "react";
import NavBar from "../../components/NavBar";
import api from "../../services/api";
// import "./transactions.css";

function formatDateInput(d) {
const y = d.getFullYear();
const m = String(d.getMonth() + 1).padStart(2, "0");
const day = String(d.getDate()).padStart(2, "0");
return `${y}-${m}-${day}`;
}

function todayInputDate() {
const d = new Date();
d.setHours(12, 0, 0, 0);
return formatDateInput(d);
}

function addDaysInputDate(dateStr, days) {
const d = new Date(`${dateStr}T12:00:00`);
d.setDate(d.getDate() + days);
return formatDateInput(d);
}

function createInitialIssueState() {
const t = todayInputDate();
return {
bookId: "",
authorDisplay: "",
serialNumber: "",
membershipNumber: "",
issueDate: t,
returnDate: addDaysInputDate(t, 15),
remarks: ""
};
}

function createInitialReturnState() {
return {
bookTitle: "",
transactionId: "",
serialNumber: "",
authorDisplay: "",
issueDateStr: "",
returnDate: todayInputDate(),
remarks: ""
};
}

export default function TransactionsPage() {

const [search,setSearch] = useState({
title:"",
author:"",
category:""
});

const [rows,setRows] = useState([]);
const [selectedBookId,setSelectedBookId] = useState("");

const [allBooks,setAllBooks] = useState([]);
const [issue,setIssue] = useState(() => createInitialIssueState());

const [returnBook,setReturnBook] = useState(() => createInitialReturnState());

const [payForm,setPayForm] = useState({
transactionId:"",
fineAmount:0,
finePaid:false,
remarks:""
});

const [issueRows,setIssueRows] = useState([]);
const [msg,setMsg] = useState("");
const [authors,setAuthors] = useState([]);
const [bookTitles,setBookTitles] = useState([]);
const [searching,setSearching] = useState(false);

const activeIssues = useMemo(
() =>
issueRows.filter(
(tx) => tx.status === "issued" && tx.book && tx.book._id
),
[issueRows]
);

const returnTitleOptions = useMemo(
() =>
[...new Set(
activeIssues.map((tx) => String(tx.book?.title || "").trim()).filter(Boolean)
)].sort((a, b) => a.localeCompare(b)),
[activeIssues]
);

const issuesForReturnTitle = useMemo(() => {
if (!returnBook.bookTitle) return [];
return activeIssues.filter(
(tx) => String(tx.book?.title || "").trim() === returnBook.bookTitle
);
}, [activeIssues, returnBook.bookTitle]);


const loadIssues = async () => {
try{
const {data} = await api.get("/transactions/issues");
setIssueRows(data);
}catch{
setIssueRows([]);
}
};

const loadBooksOptions = async () => {
try{
const {data} = await api.get("/books");
const list = Array.isArray(data) ? data : [];
setAllBooks(list);
const authorsUnique = [...new Set(
list.map((b)=>String(b.author||"").trim()).filter(Boolean)
)].sort((a,b)=>a.localeCompare(b));
const titlesUnique = [...new Set(
list.map((b)=>String(b.title||"").trim()).filter(Boolean)
)].sort((a,b)=>a.localeCompare(b));
setAuthors(authorsUnique);
setBookTitles(titlesUnique);
}catch{
setAllBooks([]);
setAuthors([]);
setBookTitles([]);
}
};

useEffect(()=>{
loadIssues();
loadBooksOptions();
},[]);



const handleBookSearchSubmit = async (e) => {
e.preventDefault();
try{
setSearching(true);
const titleTrim = String(document.getElementById("book-availability-title")?.value ?? "").trim();
const authorTrim = String(document.getElementById("book-availability-author")?.value ?? "").trim();
const categoryTrim = String(document.getElementById("book-availability-category")?.value ?? "").trim();

if(!titleTrim && !authorTrim && !categoryTrim){
setMsg("Please select Book Name or Author, or enter Category");
return;
}

const params = {};
if (titleTrim) params.title = titleTrim;
if (authorTrim) params.author = authorTrim;
if (categoryTrim) params.category = categoryTrim;

const {data} = await api.get("/transactions/availability",{ params });

setRows(Array.isArray(data) ? data : []);
setMsg("");
setSearch({
title:titleTrim,
author:authorTrim,
category:categoryTrim
});

}catch(err){

setMsg(err.response?.data?.message || err.message || "Search failed");

}finally{
setSearching(false);
}

};



const booksForIssue = [...allBooks]
.filter((b) => b.availability)
.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));

const resetIssueForm = () => {
setIssue(createInitialIssueState());
setMsg("");
};

const handleIssueBookChange = (e) => {
const id = e.target.value;
const book = allBooks.find((b) => String(b._id) === id);
setIssue((prev) => ({
...prev,
bookId: id,
authorDisplay: book ? String(book.author || "") : ""
}));
};

const handleIssueDateChange = (e) => {
const v = e.target.value;
const t = todayInputDate();
if (v < t) {
setMsg("Issue date cannot be before today");
return;
}
const maxRet = addDaysInputDate(v, 15);
setIssue((prev) => {
let ret = prev.returnDate;
if (ret < v) ret = v;
if (ret > maxRet) ret = maxRet;
return { ...prev, issueDate: v, returnDate: ret };
});
setMsg("");
};

const handleReturnDateChange = (e) => {
const v = e.target.value;
const minR = issue.issueDate;
const maxR = addDaysInputDate(issue.issueDate, 15);
if (v < minR || v > maxR) {
setMsg("Return date must be between issue date and 15 days after issue date");
return;
}
setIssue((prev) => ({ ...prev, returnDate: v }));
setMsg("");
};

const submitBookIssue = async () => {
try {
setMsg("");
if (!issue.bookId) {
setMsg("Please select a book");
return;
}
if (!String(issue.authorDisplay || "").trim()) {
setMsg("Author could not be loaded — select a valid book");
return;
}
if (!String(issue.membershipNumber || "").trim()) {
setMsg("Membership number is required");
return;
}
const today = todayInputDate();
if (!issue.issueDate || issue.issueDate < today) {
setMsg("Issue date cannot be before today");
return;
}
if (!issue.returnDate) {
setMsg("Return date is required");
return;
}
const maxReturn = addDaysInputDate(issue.issueDate, 15);
if (issue.returnDate > maxReturn) {
setMsg("Return date cannot be more than 15 days after the issue date");
return;
}
if (issue.returnDate < issue.issueDate) {
setMsg("Return date cannot be before the issue date");
return;
}

await api.post("/transactions/issue", {
bookId: issue.bookId,
membershipNumber: String(issue.membershipNumber || "").trim(),
issueDate: issue.issueDate,
returnDate: issue.returnDate,
remarks: issue.remarks || ""
});

setMsg("Book issued successfully");
setIssue(createInitialIssueState());
loadIssues();
} catch (err) {
setMsg(err.response?.data?.message || err.message || "Issue failed");
}
};

const handleIssueFormSubmit = async (e) => {
e.preventDefault();
await submitBookIssue();
};

const handleIssueCancel = () => {
resetIssueForm();
};

const handleReturnTitleChange = (e) => {
const v = e.target.value;
setReturnBook({
bookTitle: v, 
transactionId: "",
serialNumber: "",
authorDisplay: "",
issueDateStr: "",
returnDate: todayInputDate(),
remarks: ""
});
setMsg("");
};

const handleReturnSerialChange = (e) => {
const tid = e.target.value;
if (!tid) {
setReturnBook((prev) => ({
...prev,
transactionId: "",
serialNumber: "",
authorDisplay: "",
issueDateStr: ""
}));
return;
}
const tx = activeIssues.find((t) => String(t._id) === tid);
if (!tx || !tx.book) return;
const issueDateStr = tx.issueDate
? formatDateInput(new Date(tx.issueDate))
: "";
setReturnBook((prev) => {
const today = todayInputDate();
let ret = prev.returnDate;
if (issueDateStr && ret < issueDateStr) {
ret = today >= issueDateStr ? today : issueDateStr;
}
return {
...prev,
transactionId: tid,
serialNumber: String(tx.book.serialNumber || ""),
authorDisplay: String(tx.book.author || ""),
issueDateStr,
returnDate: ret
};
});
setMsg("");
};

const resetReturnForm = () => {
setReturnBook(createInitialReturnState());
setMsg("");
};

const handleReturnFormSubmit = async (e) => {
e.preventDefault();
await submitReturnBook();
};

const submitReturnBook = async () => {
try {
setMsg("");
if (!String(returnBook.bookTitle || "").trim()) {
setMsg("Please select a book name");
return;
}
if (!returnBook.transactionId || !String(returnBook.serialNumber || "").trim()) {
setMsg("Serial number is mandatory — select a copy");
return;
}
if (!returnBook.returnDate) {
setMsg("Return date is required");
return;
}
if (returnBook.issueDateStr && returnBook.returnDate < returnBook.issueDateStr) {
setMsg("Return date cannot be before the issue date");
return;
}

const { data } = await api.post("/transactions/return", {
transactionId: returnBook.transactionId,
serialNumber: returnBook.serialNumber,
returnDate: returnBook.returnDate,
remarks: returnBook.remarks || ""
});

setMsg(`Return initiated. Fine amount: ${data.fine.amount}`);

setPayForm((prev) => ({
...prev,
transactionId: returnBook.transactionId,
fineAmount: data.fine.amount
}));

setReturnBook(createInitialReturnState());
loadIssues();
} catch (err) {
setMsg(err.response?.data?.message || err.message || "Return failed");
}
};



const payFine = async () => {

try{

if(!payForm.transactionId){
return setMsg("Transaction id is required");
}

const {data} = await api.post("/transactions/pay-fine",payForm);

setMsg(data.message);

loadIssues();

}catch(err){

setMsg(err.response?.data?.message || err.message);

}

};



return(

<div className="page">

<NavBar/>

<h2>Transactions</h2>

{msg && <p className="error">{msg}</p>}

<div className="maintenance-grid">



<div className="card book-availability">

<h3>Book Availability</h3>

<form className="book-availability-fields" onSubmit={handleBookSearchSubmit} noValidate>

<div className="field">
<label htmlFor="book-availability-title">Book Name</label>
<select
id="book-availability-title"
name="title"
value={search.title}
onChange={(e)=>setSearch({...search,title:e.target.value})}
>
<option value="">— Select book —</option>
{bookTitles.filter(Boolean).map((t)=>(
<option key={t} value={t}>{t}</option>
))}
</select>
</div>

<div className="field">
<label htmlFor="book-availability-author">Author</label>
<select
id="book-availability-author"
name="author"
value={search.author}
onChange={(e)=>setSearch({...search,author:e.target.value})}
>
<option value="">— Select author —</option>
{authors.filter(Boolean).map((a)=>(
<option key={a} value={a}>{a}</option>
))}
</select>
</div>

<div className="field">
<label htmlFor="book-availability-category">Category</label>
<input
id="book-availability-category"
name="category"
type="text"
placeholder="Category"
value={search.category}
onChange={(e)=>setSearch({...search,category:e.target.value})}
/>
</div>

<button type="submit" className="book-availability-search" disabled={searching}>
{searching ? "Searching…" : "Search"}
</button>

</form>


<table>

<thead>

<tr>
<th>Title</th>
<th>Author</th>
<th>Category</th>
<th>Select</th>
</tr>

</thead>

<tbody>

{rows.map((r)=>(

<tr key={r._id}>

<td>{r.title}</td>
<td>{r.author}</td>
<td>{r.category}</td>

<td>
<input
type="radio"
name="bookSelect"
onChange={()=>setSelectedBookId(r._id)}
/>
</td>

</tr>

))}

</tbody>

</table>

</div>




<div className="card book-issue">

<h3>Book Issue</h3>

<form className="book-issue-fields" onSubmit={handleIssueFormSubmit} noValidate>

<div className="field">
<label htmlFor="issue-book-select">Enter Book Name</label>
<select
id="issue-book-select"
value={issue.bookId}
onChange={handleIssueBookChange}
required
>
<option value="">— Select book —</option>
{booksForIssue.map((b) => (
<option key={b._id} value={b._id}>
{String(b.title || "")}
{b.serialNumber ? ` (${b.serialNumber})` : ""}
</option>
))}
</select>
</div>

<div className="field">
<label htmlFor="issue-author-readonly">Enter Author</label>
<input
id="issue-author-readonly"
type="text"
readOnly
value={issue.authorDisplay}
placeholder="Select a book first"
/>
</div>

<div className="field">
<label htmlFor="issue-membership-number">
Membership Number <span className="optional-hint">(mandatory)</span>
</label>
<input
id="issue-membership-number"
type="text"
value={issue.membershipNumber}
placeholder="e.g. M123"
onChange={(e) => setIssue({ ...issue, membershipNumber: e.target.value })}
required
/>
</div>

<div className="field">
<label>Serial No of the book <span className="optional-hint">(mandatory)</span></label>

<select
value={issue.serialNumber}
onChange={(e)=>setIssue({...issue,serialNumber:e.target.value})}
required
>

<option value="">— Select serial —</option>

{booksForIssue
.filter(b=>String(b._id)===issue.bookId)
.map((b)=>(
<option key={b.serialNumber} value={b.serialNumber}>
{b.serialNumber}
</option>
))}

</select>

</div>


<div className="field">
<label htmlFor="issue-issue-date">Issue Date</label>
<input
id="issue-issue-date"
type="date"
value={issue.issueDate}
min={todayInputDate()}
onChange={handleIssueDateChange}
required
/>
</div>

<div className="field">
<label htmlFor="issue-return-date">Return Date</label>
<input
id="issue-return-date"
type="date"
value={issue.returnDate}
min={issue.issueDate}
max={addDaysInputDate(issue.issueDate, 15)}
onChange={handleReturnDateChange}
required
/>
</div>

<div className="field">
<label htmlFor="issue-remarks">
Remarks <span className="optional-hint">(optional)</span>
</label>
<textarea
id="issue-remarks"
value={issue.remarks}
placeholder="Optional notes"
onChange={(e) => setIssue({ ...issue, remarks: e.target.value })}
rows={3}
/>
</div>

<div className="book-issue-actions">
<button type="button" className="book-issue-cancel" onClick={handleIssueCancel}>
Cancel
</button>
<button type="submit" className="book-issue-confirm">
Confirm
</button>
</div>

</form>

</div>




<div className="card book-issue">

<h3>Return Book</h3>

<form className="book-issue-fields" onSubmit={handleReturnFormSubmit} noValidate>

<div className="field">
<label htmlFor="return-book-title">Enter Book Name</label>
<select
id="return-book-title"
value={returnBook.bookTitle}
onChange={handleReturnTitleChange}
>
<option value="">— Select book —</option>
{returnTitleOptions.map((t) => (
<option key={t} value={t}>
{t}
</option>
))}
</select>
</div>

<div className="field">
<label htmlFor="return-author-readonly">Enter Author</label>
<input
id="return-author-readonly"
type="text"
readOnly
value={returnBook.authorDisplay}
placeholder={returnBook.bookTitle ? "Select serial number" : "Select a book first"}
/>
</div>

<div className="field">
<label htmlFor="return-serial">
Serial No <span className="optional-hint">(mandatory)</span>
</label>
<select
id="return-serial"
value={returnBook.transactionId}
onChange={handleReturnSerialChange}
disabled={!returnBook.bookTitle}
>
<option value="">— Select serial —</option>
{issuesForReturnTitle.map((tx) => (
<option key={tx._id} value={tx._id}>
{tx.book?.serialNumber || "—"}
</option>
))}
</select>
</div>

<div className="field">
<label htmlFor="return-issue-date">Issue Date</label>
<input
id="return-issue-date"
type="date"
readOnly
value={returnBook.issueDateStr}
/>
</div>

<div className="field">
<label htmlFor="return-return-date">Return Date</label>
<input
id="return-return-date"
type="date"
value={returnBook.returnDate}
min={returnBook.issueDateStr || undefined}
onChange={(e) =>
setReturnBook((prev) => ({ ...prev, returnDate: e.target.value }))
}
/>
</div>

<div className="field">
<label htmlFor="return-remarks">
Remarks <span className="optional-hint">(optional)</span>
</label>
<textarea
id="return-remarks"
value={returnBook.remarks}
placeholder="Optional"
rows={3}
onChange={(e) =>
setReturnBook((prev) => ({ ...prev, remarks: e.target.value }))
}
/>
</div>

<div className="book-issue-actions">
<button
type="button"
className="book-issue-cancel"
onClick={resetReturnForm}
>
Cancel
</button>
<button type="submit" className="book-issue-confirm">
Confirm
</button>
</div>

</form>

</div>




<div className="card payfine-card">

<h3>Pay Fine</h3>

<input placeholder="Book title (for reference)" />
<input placeholder="Author name (for reference)" />
<input placeholder="Serial Number" />

<label>Issue Date</label>
<input type="date" />

<label>Return Date</label>
<input type="date" />

<label>Actual Return Date</label>
<input type="date" />

<input
placeholder="Fine Calculated"
value={payForm.fineAmount}
readOnly
/>

<label className="checkbox">

<input
type="checkbox"
checked={payForm.finePaid}
onChange={(e)=>setPayForm({...payForm,finePaid:e.target.checked})}
/>

Fine Paid

</label>

<textarea
placeholder="Remarks"
onChange={(e)=>setPayForm({...payForm,remarks:e.target.value})}
/>

<div className="btn-row">

<button className="cancel-btn">
Cancel
</button>

<button onClick={payFine} className="confirm-btn">
Confirm
</button>

</div>

</div>



</div>




<div className="card table-full">

<h3>Transaction Table List</h3>

<table>

<thead>

<tr>
<th>Id</th>
<th>Book</th>
<th>Member</th>
<th>Issue Date</th>
<th>Return Date</th>
<th>Status</th>
</tr>

</thead>

<tbody>

{issueRows.map((r)=>(

<tr key={r._id}>

<td>{r._id}</td>
<td>{r.book?.title}</td>
<td>{r.member?.membershipNumber}</td>
<td>{r.issueDate?.slice(0,10)}</td>
<td>{r.returnDate?.slice(0,10)}</td>
<td>{r.status}</td>

</tr>

))}

</tbody>

</table>

</div>

</div>

);

}