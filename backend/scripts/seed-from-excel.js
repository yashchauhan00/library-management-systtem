import "dotenv/config";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import bcrypt from "bcryptjs";

import { connectDb } from "../db.js";
import Membership from "../models/Membership.js";
import User from "../models/User.js";
import Item from "../models/Item.js";

function argValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeStr(v) {
  return v == null ? "" : String(v).trim();
}

function findSheet(workbook, candidates) {
  const names = workbook.SheetNames || [];
  for (const c of candidates) {
    const hit = names.find((n) => normalizeStr(n).toLowerCase() === normalizeStr(c).toLowerCase());
    if (hit) return hit;
  }
  return null;
}

function sheetToRows(workbook, sheetName) {
  if (!sheetName) return [];
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

async function main() {
  const file = argValue("--file");
  const clear = (argValue("--clear") || "true").toLowerCase() !== "false";

  const adminUserId = argValue("--adminUser") || "adm";
  const adminPassword = argValue("--adminPassword") || "admin123";
  const adminName = argValue("--adminName") || "Admin";

  await connectDb();

  // Create default membership so new users can be seeded easily.
  const defaultMembership = await Membership.findOne({ membershipCode: "DEFAULT" });
  if (!defaultMembership) {
    await Membership.create({
      membershipCode: "DEFAULT",
      name: "Default",
      borrowDurationDays: Number(process.env.DEFAULT_BORROW_DURATION_DAYS || 7),
      finePerDay: Number(process.env.DEFAULT_FINE_PER_DAY || 5),
      maxBorrowLimit: Number(process.env.DEFAULT_MAX_BORROW_LIMIT || 5),
    });
  }

  if (clear) {
    await User.deleteMany({});
    await Item.deleteMany({});
    // keep memberships unless you want full reset
  }

  // Ensure admin exists
  const admin = await User.findOne({ userId: adminUserId });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const membership = await Membership.findOne({ membershipCode: "DEFAULT" });
    await User.create({
      userId: adminUserId,
      passwordHash,
      role: "admin",
      name: adminName,
      membership: membership?._id ?? null,
      status: "active",
    });
  }

  if (!file) {
    console.log("No --file provided. Seeded only admin + default membership.");
    process.exit(0);
  }

  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Excel file not found: ${resolved}`);
  }

  const workbook = XLSX.readFile(resolved);

  // Expected columns (case sensitive in Excel headers)
  // Memberships sheet: membershipCode, name, borrowDurationDays, finePerDay, maxBorrowLimit
  // Users sheet: userId, name, password, role (optional), membershipCode (or membershipId)
  // Items sheet:
  //   - either sheet Books/Movies with columns: itemCode,title,category,totalCopies,availableCopies(optional)
  //   - or a single Items sheet with column itemType (book/movie)

  const membershipRows = sheetToRows(workbook, findSheet(workbook, ["Memberships", "Membership"]));
  for (const r of membershipRows) {
    const membershipCode = normalizeStr(r.membershipCode || r.membershipID || r.code);
    if (!membershipCode) continue;

    await Membership.findOneAndUpdate(
      { membershipCode },
      {
        membershipCode,
        name: normalizeStr(r.name || membershipCode),
        borrowDurationDays: toNumber(r.borrowDurationDays ?? r.borrowDuration) ?? 7,
        finePerDay: toNumber(r.finePerDay ?? r.fine) ?? 5,
        maxBorrowLimit: toNumber(r.maxBorrowLimit ?? r.maxBorrow) ?? 5,
      },
      { upsert: true, new: true }
    );
  }

  const usersSheetName = findSheet(workbook, ["Users", "User", "Members"]);
  const userRows = sheetToRows(workbook, usersSheetName);
  for (const r of userRows) {
    const userId = normalizeStr(r.userId ?? r.userID ?? r.id);
    if (!userId) continue;

    const password = normalizeStr(r.password ?? r.pass ?? r.Password);
    if (!password && userId !== adminUserId) {
      throw new Error(`Missing password for userId=${userId} in Excel Users sheet`);
    }

    const membershipCode = normalizeStr(r.membershipCode ?? r.membershipID ?? r.membership);
    const membership = membershipCode
      ? await Membership.findOne({ membershipCode })
      : await Membership.findOne({ membershipCode: "DEFAULT" });

    const role = normalizeStr(r.role || r.userType).toLowerCase() || (userId === adminUserId ? "admin" : "user");
    const passwordHash = password ? await bcrypt.hash(password, 10) : (await User.findOne({ userId }))?.passwordHash;

    await User.findOneAndUpdate(
      { userId },
      {
        userId,
        name: normalizeStr(r.name || userId),
        passwordHash,
        role: role === "admin" ? "admin" : "user",
        membership: membership?._id ?? null,
        status: "active",
      },
      { upsert: true, new: true }
    );
  }

  const itemsSheetName = findSheet(workbook, ["Items", "BooksMovies", "Books", "Movies"]);
  const booksSheetName = findSheet(workbook, ["Books", "Book"]);
  const moviesSheetName = findSheet(workbook, ["Movies", "Movie"]);

  async function upsertItemsFromSheet(sheetName, itemType) {
    const rows = sheetToRows(workbook, sheetName);
    for (const r of rows) {
      const itemCode = normalizeStr(r.itemCode ?? r.itemID ?? r.code);
      if (!itemCode) continue;

      const totalCopies = toNumber(r.totalCopies ?? r.total ?? r.copies) ?? 0;
      const availableCopies = toNumber(r.availableCopies ?? r.available) ?? totalCopies;

      await Item.findOneAndUpdate(
        { itemCode },
        {
          itemCode,
          title: normalizeStr(r.title ?? r.name ?? itemCode),
          category: normalizeStr(r.category ?? r.cat ?? "General"),
          itemType: itemType ?? normalizeStr(r.itemType).toLowerCase() ?? "book",
          totalCopies,
          availableCopies,
        },
        { upsert: true, new: true }
      );
    }
  }

  if (booksSheetName) await upsertItemsFromSheet(booksSheetName, "book");
  if (moviesSheetName) await upsertItemsFromSheet(moviesSheetName, "movie");

  // Single-sheet fallback: "Items" with itemType column
  if (!booksSheetName && !moviesSheetName && itemsSheetName) {
    await upsertItemsFromSheet(itemsSheetName, null);
  }

  console.log("Seed completed.");
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed:", err?.message || err);
  process.exit(1);
});

