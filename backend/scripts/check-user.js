import "dotenv/config";
import User from "../models/User.js";
import { connectDb } from "../db.js";

const email = process.argv[2];
if (!email) {
  // eslint-disable-next-line no-console
  console.log("Usage: node scripts/check-user.js <emailOrUserId>");
  process.exit(1);
}

async function run() {
  await connectDb();
  const u = await User.findOne({ userId: email });
  if (!u) {
    // eslint-disable-next-line no-console
    console.log(null);
    process.exit(0);
  }
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      { userId: u.userId, role: u.role, name: u.name, membership: u.membership },
      null,
      2
    )
  );
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

