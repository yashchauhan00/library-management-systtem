<<<<<<< HEAD
# Library Management System (Full-Stack)

Flowchart ke hisaab se ye app:
- `Admin` aur `User` login support karta hai (JWT auth)
- `Admin` ke liye Maintenance menu (Memberships, Books/Movies, Users) available hai
- Dono ke liye Reports (Active Issues, Master Lists, Overdue Returns, Pending Issue Requests)
- Transactions: Availability check, Issue, Return + fine calculation
- MongoDB + Mongoose models + Excel se seed script

## Prerequisites
1. **Node.js** (v18+ recommended)
2. **MongoDB** installed + running locally (`mongodb://127.0.0.1:27017`)

## Project Structure
- `backend/` = Node.js/Express + MongoDB/Mongoose + APIs + seed script
- `frontend/` = React (Vite) + routing + UI

## Setup (Local)

### 1) Backend
1. `backend/.env` verify/edit karein:
   - `MONGODB_URI`
   - `JWT_SECRET`
2. Dependencies:
   - `cd backend`
   - `npm install`
3. Start backend:
   - `npm run dev`
   - Default port: `http://localhost:5000`

### 2) Database Seed
Default behavior:
- Excel file na do to seed script **only**:
  - `DEFAULT` membership
  - Admin user (`adm / admin123`)
  create karega.

Excel se seed:
1. `cd backend`
2. Run:
   - `node scripts/seed-from-excel.js --file path/to/your.xlsx --clear true`

Optional args:
- `--adminUser <id>`
- `--adminPassword <password>`
- `--adminName <name>`
- `--clear true|false` (default: `true`)

Seed script expected sheets/columns (starting point):
- **Memberships**: `membershipCode, name, borrowDurationDays, finePerDay, maxBorrowLimit`
- **Users**: `userId, name, password, role(optional: user/admin), membershipCode(optional)`
- **Books** / **Movies**:
  - `itemCode, title, category, totalCopies, availableCopies(optional)`
- Or single **Items** sheet:
  - same columns + `itemType` (book/movie)

### 3) Frontend
1. `cd frontend`
2. Dependencies:
   - `npm install`
3. Start frontend:
   - `npm run dev`
   - Default port: `http://localhost:5173`

Frontend API base URL:
- `frontend/.env` me:
  - `VITE_API_BASE_URL=http://localhost:5000`

## Login Credentials (Default)
- Admin: `adm` / `admin123`
- User: (Excel seed ke baad)

## API (High-level)
Auth:
- `POST /api/auth/login`
- `GET /api/auth/me`

Admin (JWT + role=admin):
- `PUT /api/admin/memberships/:code`
- `GET /api/admin/memberships`
- `PUT /api/admin/items/:itemCode`
- `GET /api/admin/items?type=book|movie`
- `PUT /api/admin/users/:userId`
- `GET /api/admin/users?role=user`

Transactions (JWT required):
- `POST /api/transactions/check-availability` `{ itemCode }`
- `POST /api/transactions/issue` `{ itemCode }`
- `POST /api/transactions/return` `{ itemCode }`

Reports (JWT required):
- `GET /api/reports/active-issues`
- `GET /api/reports/master/members`
- `GET /api/reports/master/items?type=book|movie`
- `GET /api/reports/overdue-returns`
- `GET /api/reports/pending-issue-requests`

## Notes / Assumptions
- Issue/Return logic: `return` ke time `fine` calculate hota hai using membership `finePerDay` and `borrowDurationDays`.
- Availability: `issue` pe `availableCopies` decrease hota hai, `return` pe increase hota hai.
- Pending requests: `return` ke baad pehli pending request auto-approve ho sakti hai agar borrow limit aur copies available ho.

=======
# library-management-system
A full-stack Library Management System built using MERN Stack (MongoDB, Express.js, React.js, Node.js).
>>>>>>> 68d4e309b2c13721390cb3e5ef62bb665b15dacc
