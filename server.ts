import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("results.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS exam_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT,
    student_class TEXT,
    case_number INTEGER,
    scores TEXT,
    summary TEXT,
    tops TEXT,
    tips TEXT,
    final_grade TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/save-result", (req, res) => {
    const { name, className, caseNumber, scores, summary, tops, tips, finalGrade } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO exam_results (student_name, student_class, case_number, scores, summary, tops, tips, final_grade)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(name, className, caseNumber, JSON.stringify(scores), summary, JSON.stringify(tops), JSON.stringify(tips), finalGrade);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save result" });
    }
  });

  app.get("/api/results", (req, res) => {
    const results = db.prepare("SELECT * FROM exam_results ORDER BY created_at DESC").all();
    res.json(results);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
