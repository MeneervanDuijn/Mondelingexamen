-- Schema for Mondeling Trainer Maatschappijleer VMBO (Cloudflare D1 or SQLite)
CREATE TABLE IF NOT EXISTS exam_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_name TEXT NOT NULL,
  student_class TEXT NOT NULL,
  case_number INTEGER,
  scores TEXT NOT NULL, -- JSON formatted string of criteria scores
  summary TEXT,
  tops TEXT, -- JSON formatted string of tops
  tips TEXT, -- JSON formatted string of tips
  final_grade TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
