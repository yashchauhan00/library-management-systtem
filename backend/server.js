import "dotenv/config";
import app from "./app.js";
import { connectDb } from "./db.js";

const port = process.env.PORT || 5001;

async function start() {
  await connectDb();
  app.listen(port, () => {
    
    console.log(`Backend running on http://localhost:${port}`);
  });
}

start().catch((err) => {
  
  console.error("Failed to start backend:", err);
  process.exit(1);
});

