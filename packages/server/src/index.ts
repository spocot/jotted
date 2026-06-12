import express from "express";
import cors from "cors";
import { getDb } from "./db/index.js";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

getDb();

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
