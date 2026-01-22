// backend/server.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const pool = require("./db");
const path = require("path");
const moment = require("moment");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
require("dotenv").config();
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const rateLimit = require("express-rate-limit");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER_EMAIL = "Shahjalal Mosque <no-reply@smicsouthampton.co.uk>";

const PDFDocument = require("pdfkit");
const multer = require("multer");
const fs = require("fs");
const stripe = require("stripe")(process.env.SK_SECRET_KEY);
const app = express();
app.set("trust proxy", 1);
app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: "session",
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  }),
);
const PORT = process.env.PORT || 3000;

// --- CLOUDINARY SETUP ---
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Use Memory Storage (don't save to disk)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(
  cors({
    origin: "https://smicsouthampton.co.uk",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/config", (req, res) => {
  res.json({
    publishableKey: process.env.PK_SECRET_KEY,
  });
});

function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === "admin") {
    return next(); // They are an admin! Let them pass.
  }
  // If not, kick them back to the login page
  res.redirect("/login");
}
function isStaff(req, res, next) {
  if (
    req.session &&
    req.session.user &&
    (req.session.user.role === "admin" || req.session.user.role === "teacher")
  ) {
    return next();
  }
  res.redirect("/login");
}

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Strict limiter for Login and Password resets (stops brute force)
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // Start blocking after 10 failed attempts
  message: "Too many login attempts. Please try again in an hour.",
  standardHeaders: true,
  legacyHeaders: false,
});

// --- PAGE ROUTES ---
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/index.html")),
);
app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/login.html")),
);
app.get("/reset-password.html", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/reset-password.html")),
);
app.get("/forgot-password", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/forgot-password.html")),
);
app.get("/admin", isAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/admin.html")),
);
app.get("/admin/teachers", isAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/teachers.html")),
);
app.get("/admin/students", isAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/students.html")),
);
app.get("/admin/attendance", isStaff, (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/attendance.html")),
);
app.get("/admin/fees", isAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/fees.html")),
);
app.get("/admin/notices", isAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/notices.html")),
);
app.get("/admin/faq", isAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/admin-faq.html")),
);
app.get("/admin/videos", isAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/admin-videos.html")),
);
app.get("/admin/gallery", isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/admin-gallery.html"));
});
app.get("/donate", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/donate.html")),
);
app.get("/services/education", (req, res) =>
  res.sendFile(
    path.join(__dirname, "../frontend/services/category/education.html"),
  ),
);
app.get("/services/education/madrasah", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../frontend/services/category/madrasah-detail.html"),
  );
});

app.get("/services/education/adults", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../frontend/services/category/adult-detail.html"),
  );
});
app.get("/services/marriage", (req, res) =>
  res.sendFile(
    path.join(__dirname, "../frontend/services/category/marriage.html"),
  ),
);
app.get("/services/funeral", (req, res) =>
  res.sendFile(
    path.join(__dirname, "../frontend/services/category/funeral.html"),
  ),
);
app.get("/services/ask-imam", (req, res) =>
  res.sendFile(
    path.join(__dirname, "../frontend/services/category/ask-imam.html"),
  ),
);
app.get("/about/overview", (req, res) =>
  res.sendFile(
    path.join(__dirname, "../frontend/about-us/pages/overview.html"),
  ),
);
app.get("/about/staff", (req, res) =>
  res.sendFile(
    path.join(__dirname, "../frontend/about-us/pages/staff-directory.html"),
  ),
);

app.get("/about/vision", (req, res) =>
  res.sendFile(
    path.join(__dirname, "../frontend/about-us/pages/vision-and-values.html"),
  ),
);
app.get("/media/recordings", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../frontend/audio-video/pages/audio-video.html"),
  );
});
app.get("/media/gallery", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../frontend/audio-video/pages/event-gallery.html"),
  );
});
app.get("/privacy-policy", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/pages/privacy-policy.html")),
);
app.get("/sitemap.xml", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/sitemap.xml"));
});
// --- API ROUTES ---

// --- 1. AUTHENTICATION ---
app.post("/api/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (match) {
      // 1. SAVE TO SESSION (This allows the isAdmin guard to work)
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
      };

      // 2. Keep your existing Teacher Logging
      if (user.role === "teacher") {
        await pool.query("INSERT INTO login_logs (teacher_id) VALUES ($1)", [
          user.id,
        ]);
      }

      // 3. Send response back to frontend
      res.json({
        success: true,
        user: req.session.user, // Send back the session data
      });
    } else {
      res.status(401).json({ success: false, message: "Incorrect password" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});
app.post("/api/change-password", async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  // --- STRONG PASSWORD CHECK ---
  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!strongPasswordRegex.test(newPassword)) {
    return res.json({
      success: false,
      message:
        "Password too weak. Must be 8+ chars with uppercase, lowercase, and number.",
    });
  }
  try {
    const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    if (userRes.rows.length === 0)
      return res.json({ success: false, message: "User not found" });

    const user = userRes.rows[0];

    // --- NEW: VERIFY OLD PASSWORD ---
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    //  HASH NEW PASSWORD
    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      newHashedPassword,
      userId,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// --- 2. CLASS LEVELS ---
app.get("/api/levels", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM levels ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

app.post("/api/levels", async (req, res) => {
  try {
    await pool.query("INSERT INTO levels (name) VALUES ($1)", [req.body.name]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

app.delete("/api/levels/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM levels WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// --- 3. TEACHERS ---
app.get("/api/teachers", isAdmin, async (req, res) => {
  try {
    const query = `
    SELECT u.id, u.username, u.email, -- Added u.email
           COALESCE(STRING_AGG(l.name, ', '), 'Unassigned') as assigned_classes
    FROM users u
    LEFT JOIN teacher_levels tl ON u.id = tl.teacher_id
    LEFT JOIN levels l ON tl.level_id = l.id
    WHERE u.role = 'teacher'
    GROUP BY u.id
    ORDER BY u.username`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// Add New Teacher
app.post("/api/teachers", async (req, res) => {
  const { username, email, password, levelIds } = req.body;

  // --- STRONG PASSWORD CHECK ---
  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!strongPasswordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      message:
        "Password too weak. Must be 8+ chars with uppercase, lowercase, and number.",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const userRes = await pool.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, 'teacher') RETURNING id",
      [username, email, hashedPassword],
    );

    const newUserId = userRes.rows[0].id;

    // 3. Assign Levels
    if (levelIds && levelIds.length > 0) {
      for (const levelId of levelIds) {
        await pool.query(
          "INSERT INTO teacher_levels (teacher_id, level_id) VALUES ($1, $2)",
          [newUserId, levelId],
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Teacher Creation Error:", err.message);
    // Handle duplicate email/username error specifically
    if (err.code === "23505") {
      // Postgres duplicate key error code
      return res
        .status(400)
        .json({ success: false, message: "Username or Email already exists." });
    }
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + err.message });
  }
});

app.delete("/api/teachers/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// Teacher Logs
app.get("/api/teacher-logs", isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.username, l.login_time FROM login_logs l JOIN users u ON l.teacher_id = u.id ORDER BY l.login_time DESC LIMIT 50`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

app.get("/api/teachers/:id/logs", isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT login_time FROM login_logs WHERE teacher_id = $1 ORDER BY login_time DESC LIMIT 100",
      [req.params.id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// Teacher Levels (Edit)
app.get("/api/teachers/:id/levels", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT level_id FROM teacher_levels WHERE teacher_id = $1",
      [req.params.id],
    );
    res.json(result.rows.map((row) => row.level_id));
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

app.put("/api/teachers/:id/levels", isAdmin, async (req, res) => {
  const { id } = req.params;
  const { levelIds } = req.body;
  try {
    await pool.query("DELETE FROM teacher_levels WHERE teacher_id = $1", [id]);
    if (levelIds && levelIds.length > 0) {
      for (const levelId of levelIds) {
        await pool.query(
          "INSERT INTO teacher_levels (teacher_id, level_id) VALUES ($1, $2)",
          [id, levelId],
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
// Update Teacher Info (Email)
app.put("/api/teachers/:id/info", async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  try {
    await pool.query("UPDATE users SET email = $1 WHERE id = $2", [email, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    // Check for duplicate email error code (23505 in Postgres)
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ success: false, message: "Email is already taken" });
    }
    res.status(500).json({ success: false, message: "Update failed" });
  }
});
// Get Students for Teacher Search
app.get("/api/teachers/:id/students", isAdmin, async (req, res) => {
  try {
    const levelsRes = await pool.query(
      `SELECT l.name FROM teacher_levels tl JOIN levels l ON tl.level_id = l.id WHERE tl.teacher_id = $1`,
      [req.params.id],
    );
    const levels = levelsRes.rows.map((r) => r.name);
    if (levels.length === 0) return res.json([]);
    const studentsRes = await pool.query(
      `SELECT id, first_name, last_name, level FROM students WHERE level = ANY($1) ORDER BY first_name`,
      [levels],
    );
    res.json(studentsRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// --- 4. STUDENTS ---
// --- GET STUDENTS (With Filter) ---
app.get("/api/students", isAdmin, async (req, res) => {
  try {
    const { status } = req.query; // Get status from URL (e.g. ?status=pending)

    // Default to 'approved' if no status is specified
    const filterStatus = status || "approved";

    const today = new Date();
    const currentYear = today.getFullYear();
    const isBeforeSept = today.getMonth() < 8;
    const academicYear = isBeforeSept
      ? `${currentYear - 1}/${currentYear}`
      : `${currentYear}/${currentYear + 1}`;

    const query = `
        SELECT s.*, 
               COALESCE(e.sem1_score, 0) as sem1_score,
               COALESCE(e.sem2_score, 0) as sem2_score,
               COALESCE(e.sem3_score, 0) as sem3_score,
               COALESCE(e.final_grade, 0) as result_final_grade
        FROM students s
        LEFT JOIN exam_results e 
        ON s.id = e.student_id AND e.academic_year = $1
        WHERE s.status = $2  -- FILTER BY STATUS
        ORDER BY s.id DESC`; // Newest first

    const result = await pool.query(query, [academicYear, filterStatus]);

    const rows = result.rows.map((row) => ({
      ...row,
      final_grade: row.result_final_grade,
    }));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
// GET Results for a specific student & year
app.get("/api/students/:id/results", isAdmin, async (req, res) => {
  const { id } = req.params;
  const { year } = req.query; // e.g. "2024/2025"

  try {
    const result = await pool.query(
      "SELECT * FROM exam_results WHERE student_id = $1 AND academic_year = $2",
      [id, year],
    );
    res.json(result.rows[0] || {}); // Return empty obj if no data yet
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// --- SAVE RESULTS (Updated for Hifz Memorization & Revision) ---
app.put("/api/students/:id/results", async (req, res) => {
  const { id } = req.params;
  const {
    academic_year,
    sem1,
    sem2,
    sem3,
    // Memorization Inputs (Strings from frontend)
    hifz_mem_s1_start,
    hifz_mem_s1_end,
    hifz_mem_s2_start,
    hifz_mem_s2_end,
    hifz_mem_s3_start,
    hifz_mem_s3_end,
    // Revision Inputs
    hifz_rev_s1_start,
    hifz_rev_s1_end,
    hifz_rev_s2_start,
    hifz_rev_s2_end,
    hifz_rev_s3_start,
    hifz_rev_s3_end,
  } = req.body;

  if (!academic_year) {
    return res
      .status(400)
      .json({ success: false, message: "Academic Year is required" });
  }

  // 1. Clean Academic Scores (Float for percentages)
  const s1 = parseFloat(sem1) || 0;
  const s2 = parseFloat(sem2) || 0;
  const s3 = parseFloat(sem3) || 0;
  const final = ((s1 + s2 + s3) / 3).toFixed(2);

  // 2. Clean Hifz Page Inputs (Ensure INT, default to 0 if empty)
  // This step fixes the "invalid input syntax" error
  const m1_s = parseInt(hifz_mem_s1_start) || 0;
  const m1_e = parseInt(hifz_mem_s1_end) || 0;
  const m2_s = parseInt(hifz_mem_s2_start) || 0;
  const m2_e = parseInt(hifz_mem_s2_end) || 0;
  const m3_s = parseInt(hifz_mem_s3_start) || 0;
  const m3_e = parseInt(hifz_mem_s3_end) || 0;

  const r1_s = parseInt(hifz_rev_s1_start) || 0;
  const r1_e = parseInt(hifz_rev_s1_end) || 0;
  const r2_s = parseInt(hifz_rev_s2_start) || 0;
  const r2_e = parseInt(hifz_rev_s2_end) || 0;
  const r3_s = parseInt(hifz_rev_s3_start) || 0;
  const r3_e = parseInt(hifz_rev_s3_end) || 0;

  // 3. Calculate Scores (Logic: (End - Start) * Weight)
  const calcScore = (start, end, weight) =>
    end > start ? (end - start) * weight : 0;

  const mem1_score = calcScore(m1_s, m1_e, 10);
  const mem2_score = calcScore(m2_s, m2_e, 10);
  const mem3_score = calcScore(m3_s, m3_e, 10);

  const rev1_score = calcScore(r1_s, r1_e, 5);
  const rev2_score = calcScore(r2_s, r2_e, 5);
  const rev3_score = calcScore(r3_s, r3_e, 5);

  const totalHifz =
    mem1_score + mem2_score + mem3_score + rev1_score + rev2_score + rev3_score;

  try {
    await pool.query(
      `INSERT INTO exam_results 
       (student_id, academic_year, 
        sem1_score, sem2_score, sem3_score, final_grade, 
        
        hifz_sem1_start, hifz_sem1_end, hifz_sem1_score,
        hifz_sem2_start, hifz_sem2_end, hifz_sem2_score,
        hifz_sem3_start, hifz_sem3_end, hifz_sem3_score,
        
        hifz_rev_s1_start, hifz_rev_s1_end, hifz_rev_s1_score,
        hifz_rev_s2_start, hifz_rev_s2_end, hifz_rev_s2_score,
        hifz_rev_s3_start, hifz_rev_s3_end, hifz_rev_s3_score,
        
        total_hifz_score)
       VALUES 
       ($1, $2, $3, $4, $5, $6, 
        $7, $8, $9, $10, $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20, $21, $22, $23, $24, 
        $25)
       ON CONFLICT (student_id, academic_year)
       DO UPDATE SET 
         sem1_score=$3, sem2_score=$4, sem3_score=$5, final_grade=$6,
         hifz_sem1_start=$7, hifz_sem1_end=$8, hifz_sem1_score=$9,
         hifz_sem2_start=$10, hifz_sem2_end=$11, hifz_sem2_score=$12,
         hifz_sem3_start=$13, hifz_sem3_end=$14, hifz_sem3_score=$15,
         hifz_rev_s1_start=$16, hifz_rev_s1_end=$17, hifz_rev_s1_score=$18,
         hifz_rev_s2_start=$19, hifz_rev_s2_end=$20, hifz_rev_s2_score=$21,
         hifz_rev_s3_start=$22, hifz_rev_s3_end=$23, hifz_rev_s3_score=$24,
         total_hifz_score=$25`,
      [
        id,
        academic_year,
        s1,
        s2,
        s3,
        final,
        m1_s,
        m1_e,
        mem1_score,
        m2_s,
        m2_e,
        mem2_score,
        m3_s,
        m3_e,
        mem3_score,
        r1_s,
        r1_e,
        rev1_score,
        r2_s,
        r2_e,
        rev2_score,
        r3_s,
        r3_e,
        rev3_score,
        totalHifz,
      ],
    );
    res.json({ success: true, message: "Results saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
// Add Student
app.post("/api/students", async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      gender,
      level,
      parent_name,
      email,
      address_line1,
      city,
      postcode,
      dob,
      mobile,
      home_tel,
      emergency_contact,
      medical_info,
      doctor_info,
    } = req.body;

    const newStudent = await pool.query(
      `INSERT INTO students 
       (first_name, last_name, gender, level, parent_name, email, 
        address_line1, city, postcode, dob, 
        phone, home_phone, emergency_phone, medical_info, doctor_info, 
        status, enrolled_date)  -- Added status & date columns
       VALUES 
       ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
        'approved', NOW())      -- CHANGED 'pending' TO 'approved'
       RETURNING *`,
      [
        first_name,
        last_name,
        gender,
        level,
        parent_name,
        email,
        address_line1,
        city,
        postcode,
        dob,
        mobile, // phone
        home_tel, // home_phone
        emergency_contact, // emergency_phone
        medical_info,
        doctor_info,
      ],
    );

    res.json(newStudent.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
// --- APPROVE STUDENT ---
app.put("/api/students/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { level } = req.body; // Allow assigning level during approval

  try {
    // If level is provided, update it. Always set status to 'approved'
    await pool.query(
      `UPDATE students SET status = 'approved', level = COALESCE($1, level) WHERE id = $2`,
      [level || null, id],
    );
    res.json({ success: true, message: "Student approved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
// --- EDIT STUDENT
app.put("/api/students/:id", async (req, res) => {
  const { id } = req.params;
  const {
    email,
    level,
    dob,
    address_line1,
    city,
    postcode,
    mobile,
    home_tel,
    emergency_contact,
    medical_info,
    doctor_info,
  } = req.body;

  try {
    await pool.query(
      `UPDATE students 
       SET email = COALESCE($1, email), 
           level = COALESCE($2, level),
           address_line1 = COALESCE($3, address_line1),
           city = COALESCE($4, city),
           postcode = COALESCE($5, postcode),
           phone = COALESCE($6, phone),
           home_phone = COALESCE($7, home_phone),
           emergency_phone = COALESCE($8, emergency_phone),
           medical_info = COALESCE($9, medical_info),
           doctor_info = COALESCE($10, doctor_info),
           dob = COALESCE($11, dob)  -- ADDED THIS LINE
       WHERE id = $12`,
      [
        email,
        level,
        address_line1,
        city,
        postcode,
        mobile,
        home_tel,
        emergency_contact,
        medical_info,
        doctor_info,
        dob,
        id,
      ],
    );
    res.json({ success: true, message: "Student updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
// --- UPDATE STUDENT RESULTS ---
// --- SAVE RESULTS (Updated for Hifz Memorization & Revision) ---
app.put("/api/students/:id/results", async (req, res) => {
  const { id } = req.params;
  const {
    academic_year,
    sem1,
    sem2,
    sem3,
    // Memorization (10 marks)
    hifz_mem_s1_start,
    hifz_mem_s1_end,
    hifz_mem_s2_start,
    hifz_mem_s2_end,
    hifz_mem_s3_start,
    hifz_mem_s3_end,
    // Revision (5 marks)
    hifz_rev_s1_start,
    hifz_rev_s1_end,
    hifz_rev_s2_start,
    hifz_rev_s2_end,
    hifz_rev_s3_start,
    hifz_rev_s3_end,
  } = req.body;

  if (!academic_year) {
    return res
      .status(400)
      .json({ success: false, message: "Academic Year is required" });
  }

  // 1. Academic
  const s1 = parseFloat(sem1) || 0;
  const s2 = parseFloat(sem2) || 0;
  const s3 = parseFloat(sem3) || 0;
  const final = ((s1 + s2 + s3) / 3).toFixed(2);

  // 2. Memorization (Pages * 10)
  const calcMem = (s, e) =>
    (parseInt(e) || 0) > (parseInt(s) || 0)
      ? ((parseInt(e) || 0) - (parseInt(s) || 0)) * 10
      : 0;
  const mem1 = calcMem(hifz_mem_s1_start, hifz_mem_s1_end);
  const mem2 = calcMem(hifz_mem_s2_start, hifz_mem_s2_end);
  const mem3 = calcMem(hifz_mem_s3_start, hifz_mem_s3_end);

  // 3. Revision (Pages * 5)
  const calcRev = (s, e) =>
    (parseInt(e) || 0) > (parseInt(s) || 0)
      ? ((parseInt(e) || 0) - (parseInt(s) || 0)) * 5
      : 0;
  const rev1 = calcRev(hifz_rev_s1_start, hifz_rev_s1_end);
  const rev2 = calcRev(hifz_rev_s2_start, hifz_rev_s2_end);
  const rev3 = calcRev(hifz_rev_s3_start, hifz_rev_s3_end);

  const totalHifz = mem1 + mem2 + mem3 + rev1 + rev2 + rev3;

  try {
    await pool.query(
      `INSERT INTO exam_results 
       (student_id, academic_year, sem1_score, sem2_score, sem3_score, final_grade, 
        hifz_sem1_start, hifz_sem1_end, hifz_sem1_score,
        hifz_sem2_start, hifz_sem2_end, hifz_sem2_score,
        hifz_sem3_start, hifz_sem3_end, hifz_sem3_score,
        hifz_rev_s1_start, hifz_rev_s1_end, hifz_rev_s1_score,
        hifz_rev_s2_start, hifz_rev_s2_end, hifz_rev_s2_score,
        hifz_rev_s3_start, hifz_rev_s3_end, hifz_rev_s3_score,
        total_hifz_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
       ON CONFLICT (student_id, academic_year)
       DO UPDATE SET 
         sem1_score=$3, sem2_score=$4, sem3_score=$5, final_grade=$6,
         hifz_sem1_start=$7, hifz_sem1_end=$8, hifz_sem1_score=$9,
         hifz_sem2_start=$10, hifz_sem2_end=$11, hifz_sem2_score=$12,
         hifz_sem3_start=$13, hifz_sem3_end=$14, hifz_sem3_score=$15,
         hifz_rev_s1_start=$16, hifz_rev_s1_end=$17, hifz_rev_s1_score=$18,
         hifz_rev_s2_start=$19, hifz_rev_s2_end=$20, hifz_rev_s2_score=$21,
         hifz_rev_s3_start=$22, hifz_rev_s3_end=$23, hifz_rev_s3_score=$24,
         total_hifz_score=$25`,
      [
        id,
        academic_year,
        s1,
        s2,
        s3,
        final,
        hifz_mem_s1_start,
        hifz_mem_s1_end,
        mem1,
        hifz_mem_s2_start,
        hifz_mem_s2_end,
        mem2,
        hifz_mem_s3_start,
        hifz_mem_s3_end,
        mem3,
        hifz_rev_s1_start,
        hifz_rev_s1_end,
        rev1,
        hifz_rev_s2_start,
        hifz_rev_s2_end,
        rev2,
        hifz_rev_s3_start,
        hifz_rev_s3_end,
        rev3,
        totalHifz,
      ],
    );
    res.json({ success: true, message: "Results saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
app.delete("/api/students/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM attendance WHERE student_id = $1", [
      req.params.id,
    ]);
    await pool.query("DELETE FROM fees WHERE student_id = $1", [req.params.id]);
    const result = await pool.query(
      "DELETE FROM students WHERE id = $1 RETURNING *",
      [req.params.id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// --- 5. ATTENDANCE ---

// --- UPDATED: Get Class List for Date (With Teacher Filter) ---
app.get("/api/attendance/class", isStaff, async (req, res) => {
  const { date, gender, level, teacherId } = req.query;

  try {
    // Base Query: Get students and their attendance for the specific date
    let query = `
      SELECT s.id, s.first_name, s.last_name, s.level, 
             COALESCE(a.status, NULL) as status
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.date = $1
    `;

    let params = [date];
    let paramCount = 1;
    let whereClauses = [];

    // --- Dynamic Joins for Teacher Filter ---
    // If filtering by teacher, we need to join the levels tables
    // to find which students belong to that teacher's classes.
    if (teacherId) {
      query += `
        JOIN levels l ON s.level = l.name 
        JOIN teacher_levels tl ON l.id = tl.level_id 
      `;
      paramCount++;
      whereClauses.push(`tl.teacher_id = $${paramCount}`);
      params.push(teacherId);
    }

    // --- Standard Filters ---
    if (gender && gender !== "All") {
      paramCount++;
      whereClauses.push(`s.gender = $${paramCount}`);
      params.push(gender);
    }

    if (level && level !== "") {
      paramCount++;
      whereClauses.push(`s.level = $${paramCount}`);
      params.push(level);
    }

    // Apply Where Clauses
    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    // Sort by name
    query += " ORDER BY s.level, s.first_name ASC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// Get Students specifically for a logged-in teacher
app.get(
  "/api/attendance/teacher-students/:teacherId",
  isStaff,
  async (req, res) => {
    const { teacherId } = req.params;
    let { date } = req.query;
    if (!date) date = new Date().toISOString().split("T")[0];
    if (
      req.session.user.role === "teacher" &&
      req.session.user.id != teacherId
    ) {
      return res
        .status(403)
        .json({ message: "Unauthorized access to other teacher data" });
    }
    try {
      const levelsRes = await pool.query(
        `SELECT l.name FROM teacher_levels tl JOIN levels l ON tl.level_id = l.id WHERE tl.teacher_id = $1`,
        [teacherId],
      );
      if (levelsRes.rows.length === 0) return res.json([]);
      const levelNames = levelsRes.rows.map((r) => r.name);
      const studentsRes = await pool.query(
        `SELECT s.id, s.first_name, s.last_name, s.level, a.status FROM students s LEFT JOIN attendance a ON s.id = a.student_id AND a.date = $2 WHERE s.level = ANY($1) ORDER BY s.level, s.first_name`,
        [levelNames, date],
      );
      res.json(studentsRes.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "A server error occurred. Please try again later.",
      });
    }
  },
);

// Get Student History
app.get("/api/attendance/student/:id", isStaff, async (req, res) => {
  const { id } = req.params;
  const { month, year } = req.query;
  try {
    const query = `
            SELECT date, status FROM attendance 
            WHERE student_id = $1 
            AND EXTRACT(MONTH FROM date) = $2 
            AND EXTRACT(YEAR FROM date) = $3
            ORDER BY date DESC`;
    const result = await pool.query(query, [id, month, year]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// Save Attendance (Unified Route)
app.post("/api/attendance", async (req, res) => {
  try {
    const { date, records } = req.body;
    for (const record of records) {
      await pool.query(
        `INSERT INTO attendance (student_id, date, status) VALUES ($1, $2, $3)
         ON CONFLICT (student_id, date) DO UPDATE SET status = EXCLUDED.status`,
        [record.student_id, date, record.status],
      );
    }
    res.json({ message: "Attendance recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// --- 6. FEES ---
app.get("/api/fees", isAdmin, async (req, res) => {
  const { month, year } = req.query;

  try {
    if (month && month !== "All") {
      // OLD: Monthly View
      const query = `
            SELECT s.id, s.first_name, s.last_name, s.level, s.parent_name, 
                   COALESCE(f.is_paid, false) as is_paid, f.amount 
            FROM students s
            LEFT JOIN fees f ON s.id = f.student_id AND f.month = $1 AND f.year = $2
            ORDER BY s.level, s.first_name`;
      const result = await pool.query(query, [month, year]);
      res.json(result.rows);
    } else {
      // NEW: Yearly View (This is the one you are using)
      const query = `
            SELECT s.id, s.first_name, s.last_name, s.level, s.parent_name, -- <--- ADDED HERE
                   f.month, f.is_paid
            FROM students s
            LEFT JOIN fees f ON s.id = f.student_id AND f.year = $1
            ORDER BY s.level, s.first_name`;

      const result = await pool.query(query, [year]);
      res.json(result.rows);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// Update Fee & Send Email
app.post("/api/fees", async (req, res) => {
  const { student_id, month, year, amount, is_paid } = req.body;

  try {
    // 1. Update Database
    await pool.query(
      `INSERT INTO fees (student_id, month, year, amount, is_paid, paid_date)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (student_id, month, year)
       DO UPDATE SET is_paid = $5, amount = $4, paid_date = NOW()`,
      [student_id, month, year, amount, is_paid],
    );

    // 2. SEND EMAIL VIA RESEND (Only if marking as PAID)
    if (is_paid === true) {
      // Fetch Student & Parent Info
      const studentRes = await pool.query(
        "SELECT first_name, last_name, parent_name, email FROM students WHERE id = $1",
        [student_id],
      );

      const student = studentRes.rows[0];

      if (student && student.email) {
        await resend.emails.send({
          from: SENDER_EMAIL,
          to: student.email,
          subject: `Payment Confirmation - ${month} ${year}`,
          text: `As-salamu alaykum ${student.parent_name},\n\nThis email is to confirm that we have received the payment for ${month} ${year} for ${student.first_name} ${student.last_name}.\n\nJazakumullahu Khairan,\nShahjalal Mosque & Islamic Center`,
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
// 1. Forgot Password (Send Email via Resend)
app.post("/api/forgot-password", loginLimiter, async (req, res) => {
  const { email } = req.body;
  try {
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (user.rows.length === 0) return res.json({ success: true }); // Fake success for security

    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 3600000; // 1 hr

    await pool.query(
      "UPDATE users SET reset_token=$1, reset_expires=$2 WHERE email=$3",
      [token, expires, email],
    );

    // Send Email (Resend)
    const link = `https://smicsouthampton.co.uk/reset-password.html?token=${token}`; // Assuming live domain, change to localhost if testing locally
    await resend.emails.send({
      from: SENDER_EMAIL,
      to: email,
      subject: "Password Reset Request",
      html: `
    <p>You requested a password reset for your account at SMIC.</p>
    <p><a href="${link}">Click here to reset your password</a></p>
    <p>If you did not request this, please ignore this email.</p>
  `,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// 2. Reset Password (Update DB)
app.post("/api/reset-password", loginLimiter, async (req, res) => {
  const { token, newPassword } = req.body;

  // --- STRONG PASSWORD CHECK ---
  // Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!strongPasswordRegex.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message:
        "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.",
    });
  }

  try {
    const user = await pool.query(
      "SELECT * FROM users WHERE reset_token=$1 AND reset_expires > $2",
      [token, Date.now()],
    );

    if (user.rows.length === 0)
      return res.status(400).json({ message: "Invalid or Expired Token" });

    const hash = await bcrypt.hash(newPassword, 10);

    // FIX: Changed 'password' to 'password_hash'
    await pool.query(
      "UPDATE users SET password_hash=$1, reset_token=NULL, reset_expires=NULL WHERE id=$2",
      [hash, user.rows[0].id],
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
// --- NEW: Trigger Reset for Logged-In User ---
app.post("/api/request-password-reset", async (req, res) => {
  const { userId } = req.body;

  try {
    const userRes = await pool.query("SELECT email FROM users WHERE id = $1", [
      userId,
    ]);
    if (userRes.rows.length === 0)
      return res.json({ success: false, message: "User not found." });

    const email = userRes.rows[0].email;
    if (!email)
      return res.json({
        success: false,
        message: "No email linked to this account.",
      });

    // Generate Token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 3600000;

    // Save Token
    await pool.query(
      "UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3",
      [token, expires, userId],
    );

    // Send Email
    const link = `https://smicsouthampton.co.uk/reset-password.html?token=${token}`;

    await resend.emails.send({
      from: SENDER_EMAIL,
      to: email,
      subject: "Password Reset Request",
      html: `
    <p>You requested a password reset for your account at SMIC.</p>
    <p><a href="${link}">Click here to reset your password</a></p>
    <p>If you did not request this, please ignore this email.</p>
  `,
    });

    // --- MASK EMAIL LOGIC ---
    const [local, domain] = email.split("@");
    const maskedLocal =
      local.length > 2
        ? `${local[0]}********${local[local.length - 1]}`
        : local;
    const maskedEmail = `${maskedLocal}@${domain}`;

    res.json({ success: true, message: `Reset link sent to ${maskedEmail}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
// --- 7. PRAYER TIMES PROXY ---
app.get("/api/prayers", async (req, res) => {
  const GUID = process.env.GUID;
  const URL = `https://time.my-masjid.com/api/TimingsInfoScreen/GetMasjidMultipleTimings?GuidId=${GUID}`;

  try {
    console.log("Fetching prayer times from My-Masjid...");
    const response = await axios.get(URL, {
      headers: {
        accept: "application/json, text/plain, */*",
        "sec-ch-ua":
          '"Microsoft Edge";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        Referer: `https://time.my-masjid.com/timingscreen/${GUID}`,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching prayer data:", error.message);
    res.status(500).json({ error: "Error fetching prayer times" });
  }
});
// --- NOTICE BOARD ROUTES ---

// 1. Get Active Notices (Public - Auto expires past dates)
app.get("/api/public/notices", async (req, res) => {
  try {
    // Only get notices where the date is TODAY or in the FUTURE
    const result = await pool.query(
      "SELECT * FROM notices WHERE event_date >= CURRENT_DATE ORDER BY event_date ASC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// 2. Get All Notices (Admin - See everything including past)
app.get("/api/admin/notices", isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notices ORDER BY event_date DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// 3. Add Notice
app.post("/api/notices", async (req, res) => {
  const { title, message, event_date } = req.body;
  try {
    await pool.query(
      "INSERT INTO notices (title, message, event_date) VALUES ($1, $2, $3)",
      [title, message, event_date],
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// 4. Delete Notice
app.delete("/api/notices/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM notices WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
app.post("/api/create-payment-intent", async (req, res) => {
  const { amount } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to pence
      currency: "gbp",
      payment_method_types: ["card"],
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});
// --- FAQ API ROUTES (Fixed for Postgres) ---

// 1. Get FAQs
app.get("/api/faqs", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM faqs ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// 2. Add FAQ
app.post("/api/faqs", async (req, res) => {
  const { question, answer } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO faqs (question, answer) VALUES ($1, $2) RETURNING id",
      [question, answer],
    );
    res.json({ id: result.rows[0].id, message: "FAQ Added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// 3. Delete FAQ
app.delete("/api/faqs/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query("DELETE FROM faqs WHERE id = $1", [id]);
    res.json({ message: "FAQ Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
// Helper: Calculate Age from DOB
function calculateAge(dobString) {
  // 1. Check if dobString exists
  if (!dobString) return "";

  // 2. Convert to string just in case
  const str = String(dobString);

  // 3. Find the first 4-digit number (the year)
  const yearMatch = str.match(/\d{4}/);

  if (yearMatch) {
    const birthYear = parseInt(yearMatch[0]);
    const currentYear = new Date().getFullYear();
    return (currentYear - birthYear).toString();
  }

  return ""; // Could not find a year
}
// ==========================================
// VIDEO / RECORDING ROUTES
// ==========================================

// 1. Get All Videos
app.get("/api/videos", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM videos ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// 2. Get Single Video (For Detail Page)
app.get("/api/videos/:id", isAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM videos WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Video not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// 3. Add Video (Admin)
app.post("/api/videos", async (req, res) => {
  const { title, video_url, summary, description } = req.body;
  try {
    await pool.query(
      "INSERT INTO videos (title, video_url, summary, description) VALUES ($1, $2, $3, $4)",
      [title, video_url, summary, description],
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// 4. Delete Video (Admin)
app.delete("/api/videos/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM videos WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
// --- GALLERY ROUTES ---

// 1. Get All Images
app.get("/api/gallery", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM gallery ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// 2. Upload Image (To Cloudinary)
app.post("/api/gallery", upload.single("imageFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    // Upload to Cloudinary using a stream
    const uploadToCloudinary = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "mosque_gallery" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          },
        );
        stream.end(fileBuffer);
      });
    };

    const result = await uploadToCloudinary(req.file.buffer);

    // Save the permanent Cloudinary URL to your database
    const imageUrl = result.secure_url;
    const { caption, category } = req.body;

    await pool.query(
      "INSERT INTO gallery (image_url, caption, category) VALUES ($1, $2, $3)",
      [imageUrl, caption, category || "gallery"],
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// 3. Delete Image (From Cloudinary & Database)
app.delete("/api/gallery/:id", async (req, res) => {
  try {
    // 1. Get the URL from DB to extract the Public ID for Cloudinary
    const result = await pool.query(
      "SELECT image_url FROM gallery WHERE id = $1",
      [req.params.id],
    );

    if (result.rows.length > 0) {
      const imageUrl = result.rows[0].image_url;
      // This extracts the unique ID from the end of the URL
      const publicId = imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`mosque_gallery/${publicId}`);
    }

    // 2. Delete from Postgres
    await pool.query("DELETE FROM gallery WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});

// 5. Serve the Admin Page
app.get("/admin/gallery", isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/admin-gallery.html"));
});
// ===========================================
// 1. PDF GENERATOR (Fixed Variables)
// ===========================================
const generateAdmissionPDF = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      let buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // --- Header ---
      const logoPath = path.join(
        __dirname,
        "../frontend/images/mosque-logo.png",
      );
      try {
        doc.image(logoPath, 40, 20, { width: 60 });
      } catch (e) {}

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .text("SMIC - PART TIME MADRASAH ADMISSION FORM", 110, 30);
      doc
        .font("Helvetica")
        .fontSize(10)
        .text("Shahjalal Mosque & Islamic Center, Southampton", 110, 50);

      doc.moveDown(1.5);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(`Full Name:  ${data.firstName} ${data.lastName}`, 40, 80);
      doc.moveTo(95, 90).lineTo(550, 90).stroke();

      // --- Details Section ---
      let y = 110;
      const lineGap = 30;

      function drawFieldLine(label, value, x, y, width) {
        doc.font("Helvetica-Bold").fontSize(10).text(label, x, y);
        const labelWidth = doc.widthOfString(label);
        const valueX = x + labelWidth + 5;
        const safeValue = value ? String(value) : ""; // Prevent crash on null

        doc.font("Helvetica").text(safeValue, valueX, y);
        doc
          .moveTo(valueX, y + 12)
          .lineTo(x + width, y + 12)
          .strokeColor("#000")
          .lineWidth(0.5)
          .stroke();
      }

      // --- ROW 1: DOB / AGE / GENDER ---
      // FIX 1: Use 'data.dob' because that is what your form sends!
      const age = calculateAge(data.dob);

      drawFieldLine("Date Of Birth:", data.dob, 40, y, 160); // Changed from dateOfBirth to dob
      drawFieldLine("Age:", age, 210, y, 100);
      drawFieldLine("Gender:", data.gender, 320, y, 230);

      // --- ROW 2: ADDRESS ---
      y += lineGap;
      const fullAddress = `${data.addressLine1}, ${data.city}, ${data.postcode}`;
      drawFieldLine("Address:", fullAddress, 40, y, 510);

      // --- ROW 3: PARENT ---
      y += lineGap;
      drawFieldLine("Name(s) of Parent/Guardian:", data.parentName, 40, y, 510);

      // --- ROW 4: CONTACT ---
      y += lineGap;
      drawFieldLine("Home Tel:", data.homePhone, 40, y, 140);
      drawFieldLine("Mobile:", data.mobilePhone, 190, y, 140);
      drawFieldLine("Emergency:", data.emergencyPhone, 340, y, 210);

      // --- ROW 5: EMAIL ---
      y += lineGap;
      drawFieldLine("Email:", data.email, 40, y, 510);

      // --- ROW 6: MEDICAL ---
      y += lineGap;
      drawFieldLine(
        "Any Medication / Medical Info:",
        data.medicalInfo,
        40,
        y,
        510,
      );

      // --- ROW 7: DOCTOR ---
      y += lineGap;
      // FIX 2: This will now work once you update education.js
      drawFieldLine("Doctor's Name & Tel:", data.doctorDetails, 40, y, 510);

      // --- Rules & Regulations (Grey Box) ---
      y += 40;
      doc
        .rect(40, y - 5, 515, 20)
        .fillColor("#e0e0e0")
        .fill();
      doc
        .fillColor("black")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("CLASS RULES AND REGULATIONS", 50, y);

      y += 25;
      doc.y = y;

      const rules = [
        "1. All children must dress appropriately- for boys, A Thawb/Jubba and a Topi.",
        "2. All girls must wear a full length Burkha/ Abaaya, Shalwar and a Scarf, which covers all the hair (no pins). Tights, Jeans, short sleeve or any other non Islamic clothing will not be allowed.",
        "3. Punctual attendance from 11.30am to 1.45pm (wintertime: 11.00am to 1.00pm) Saturday and Sunday and 5.00pm to 7.00pm Wednesday to Friday. Students must arrive on time for classes and collected by parent / guardian at end of class.",
        "4. Parents/guardians must ensure the child brings their own books, Qaida, siphara, Qur’an, etc. for each class.",
        "5. All absences must be explained by a note signed by the parent/guardian upon return.",
        "6. The method of teaching will be at the teacher’s discretion.",
        "7. Parents/guardians shall be expected to ensure that the child prepares for his/her lessons at home.",
        "8. Any queries or complaints should be made only to the head teacher or the Welfare Secretary. There must be no interruptions made by any parent/guardian whilst class is in progress.",
        "9. Any behavioural problems from a student will not be tolerated and the student may be suspended.",
        "10. Parents/guardians should notify the head teacher prior to admission of any health problems that their child has. Also keep the mosque informed of the child’s health.",
        "11. Parents/guardians will not interfere with regards to the running and arrangements of the classes.",
        "12. Class fees must be paid monthly at the beginning of each month.",
        "13. Children are not allowed to attend classes with mobile phones; hand held games, iPods, iPads, mp3s, knives, chewing gum etc. Any child found to be in possession of any of these items will have them confiscated immediately and may not be returned to the child. They may bring drinks and snacks for break time.",
        "14. All the above Rules and Regulations and any further rules decided by the head teacher or committee will have to be followed.",
        "15. DATA PERMISSION: I give permission for the Mosque to store this data securely for administrative purposes. We have safeguards in place to protect your data.",
      ];

      doc.font("Helvetica").fontSize(9);
      rules.forEach((rule) => {
        doc.text(rule, { align: "justify", width: 510 });
        doc.moveDown(0.3);
      });

      // --- Declaration ---
      doc.moveDown(0.5);
      const declY = doc.y;
      doc
        .rect(40, declY - 5, 515, 20)
        .fillColor("#e0e0e0")
        .fill();
      doc
        .fillColor("black")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("PARENT / GUARDIAN DECLARATION", 50, declY);

      doc.moveDown(1.5);
      doc
        .font("Helvetica")
        .fontSize(9)
        .text("I declare - The child does not have any behavioural problems.", {
          continued: false,
        });
      doc.text("I shall pay the fees and expenses as and when they are due.");
      doc.text(
        "I have read and understood the rules and regulations above and agree to abide by them at all times.",
      );

      // --- Signature ---
      const sigY = 750;
      doc.font("Helvetica-Bold").fontSize(10).text("PRINT NAME:", 40, sigY);
      doc
        .moveTo(110, sigY + 10)
        .lineTo(250, sigY + 10)
        .strokeColor("black")
        .stroke();
      doc.text("SIGNATURE:", 270, sigY);
      doc
        .moveTo(340, sigY + 10)
        .lineTo(450, sigY + 10)
        .stroke();
      doc.text("DATE:", 460, sigY);
      doc
        .moveTo(495, sigY + 10)
        .lineTo(555, sigY + 10)
        .stroke();

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// --- HANDLE ADMISSION (Save DB + Email PDF) ---
app.post("/api/submit-admission", async (req, res) => {
  const data = req.body;

  try {
    // 1. INSERT INTO DATABASE
    await pool.query(
      `INSERT INTO students 
       (first_name, last_name, gender, level, parent_name, email, 
        address_line1, city, postcode, dob, 
        phone, home_phone, emergency_phone, medical_info, doctor_info, status, enrolled_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pending', NOW())`,
      [
        data.firstName,
        data.lastName,
        data.gender,
        data.level || "Unassigned",
        data.parentName,
        data.email,
        data.addressLine1,
        data.city,
        data.postcode,
        data.dob || null,
        data.mobilePhone,
        data.homePhone,
        data.emergencyPhone,
        data.medicalInfo,
        data.doctorDetails,
      ],
    );

    // 2. GENERATE PDF & SEND EMAIL via RESEND
    const pdfBuffer = await generateAdmissionPDF(data);

    await resend.emails.send({
      from: SENDER_EMAIL,
      to: process.env.MOSQUE_EMAIL,
      subject: `New Admission: ${data.firstName} ${data.lastName}`,
      html: `
            <h3>New Student Application (Pending Approval)</h3>
            <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
            <p><strong>Level:</strong> ${data.level || "Not Selected"}</p>
            <p><strong>Parent:</strong> ${data.parentName}</p>
            <p>Added to Pending list. Please approve in Admin Panel.</p>
        `,
      attachments: [
        {
          filename: `Admission_${data.firstName}_${data.lastName}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    console.log(`✅ Admission saved for ${data.firstName}`);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Admission Process Failed:", error);
    res.status(500).json({ success: false });
  }
});

// --- NEW: General Enquiry (Home Page) ---
app.post("/api/submit-enquiry", async (req, res) => {
  const { name, email, message } = req.body;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #1e4d2b;">New General Enquiry</h2>
        <p><strong>From:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
        <hr style="border: 1px solid #eee;">
        <p style="white-space: pre-wrap;">${message}</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: SENDER_EMAIL,
      to: process.env.MOSQUE_EMAIL,
      reply_to: email, // Allows you to hit "Reply" in Gmail to answer them
      subject: `Enquiry from ${name}`,
      html: emailHtml,
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Enquiry Email failed:", error);
    res.status(500).json({ success: false });
  }
});

// --- NEW: Ask Imam Question ---
app.post("/api/ask-imam", async (req, res) => {
  const { name, email, question, private } = req.body;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #1e4d2b;">Question for Imam</h2>
        <p><strong>From:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
        <p><strong>Privacy:</strong> ${
          private ? "KEEP PRIVATE" : "Public Answer OK"
        }</p>
        <hr style="border: 1px solid #eee;">
        <h3>Question:</h3>
        <p style="white-space: pre-wrap; background: #f9f9f9; padding: 15px;">${question}</p>
    </div>
  `;

  try {
    const data = await resend.emails.send({
      from: SENDER_EMAIL,
      to: process.env.MOSQUE_EMAIL,
      reply_to: email,
      subject: `Ask Imam: Question from ${name}`,
      html: emailHtml,
    });

    if (data.error) {
      console.error("Resend Error:", data.error);
      return res.status(500).json({ success: false });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Ask Imam Email failed:", error);
    res.status(500).json({ success: false });
  }
});
// --- NEW: Download Marriage Form (Final Fix with Divider) ---
app.get("/api/download-marriage-form", isAdmin, (req, res) => {
  try {
    const doc = new PDFDocument({ margin: 30, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Marriage_Certificate_Form.pdf",
    );

    doc.pipe(res);

    // ===========================================
    //        1. PAGE BORDER & HEADER
    // ===========================================

    // Decorative Border
    doc.lineWidth(3).strokeColor("#000").rect(20, 20, 555, 802).stroke();
    doc.lineWidth(1).strokeColor("#000").rect(25, 25, 545, 792).stroke();

    // Bismillah Image
    const bismillahPath = path.join(
      __dirname,
      "../frontend/images/bismillah.png",
    );
    try {
      doc.image(bismillahPath, 197, 40, { width: 200, align: "center" });
    } catch (e) {
      doc
        .font("Times-Roman")
        .fontSize(12)
        .text(
          "In the name of Allah, the Most Gracious, the Most Merciful",
          0,
          50,
          { align: "center" },
        );
    }

    doc.moveDown(4);
    doc
      .font("Times-Bold")
      .fontSize(18)
      .text("CERTIFICATE OF MUSLIM MARRIAGE", 0, 90, {
        align: "center",
        underline: true,
      });

    // ===========================================
    //        2. THE TABLE GRID
    // ===========================================

    const startX = 40;
    const startY = 130;
    const col1W = 140; // Label Column width
    const col2W = 190; // Middle Column width
    const col3W = 185; // Right Column width
    const totalW = col1W + col2W + col3W; // 515

    // Column X positions
    const x1 = startX;
    const x2 = startX + col1W;
    const x3 = startX + col1W + col2W;

    let currentY = startY;

    // --- Helper: Draw a Table Row ---
    // type: 'header' | 'standard' | 'merged' | 'wakil'
    function drawRow(label, content1, content2, height, type = "standard") {
      const rowBottom = currentY + height;

      // Horizontal Lines
      doc
        .lineWidth(0.5)
        .moveTo(x1, currentY)
        .lineTo(x1 + totalW, currentY)
        .stroke(); // Top
      doc
        .moveTo(x1, rowBottom)
        .lineTo(x1 + totalW, rowBottom)
        .stroke(); // Bottom

      // Vertical Lines (Outer)
      doc.moveTo(x1, currentY).lineTo(x1, rowBottom).stroke(); // Left
      doc
        .moveTo(x1 + totalW, currentY)
        .lineTo(x1 + totalW, rowBottom)
        .stroke(); // Right

      // Vertical Divider 1 (Labels vs Content)
      if (type !== "merged_all") {
        doc.moveTo(x2, currentY).lineTo(x2, rowBottom).stroke();
      }

      // Vertical Divider 2 (Middle Split)
      // FIX: Added 'wakil' here so it draws the line!
      if (type === "standard" || type === "header" || type === "wakil") {
        doc.moveTo(x3, currentY).lineTo(x3, rowBottom).stroke();
      }

      // --- Text Content ---
      const textPad = 5;
      const textY = currentY + textPad;

      // Label Column
      doc
        .font("Times-Bold")
        .fontSize(10)
        .text(label, x1 + textPad, textY, { width: col1W - 10 });

      if (type === "merged_right") {
        // Col 2 spans to end (Dower)
        doc.font("Times-Roman").text(content1 || "", x2 + textPad, textY, {
          width: col2W + col3W - 10,
        });
      } else {
        // Standard 3 columns (Used for standard, header, and wakil)
        doc
          .font("Times-Roman")
          .text(content1 || "", x2 + textPad, textY, { width: col2W - 10 });
        doc.text(content2 || "", x3 + textPad, textY, { width: col3W - 10 });
      }

      // --- Signature Lines ---
      // For Wakil, Witness, or Solemniser
      if (
        label.includes("Signature") ||
        type === "wakil" ||
        label.includes("Witness") ||
        label.includes("Solemnising")
      ) {
        // Check specifically for Wakil to ensure signature is in 3rd column
        if (
          type === "wakil" ||
          label.includes("Witness") ||
          label.includes("Solemnising")
        ) {
          doc
            .font("Times-Roman")
            .fontSize(9)
            .text(
              "Signature...................................................",
              x3 + 5,
              rowBottom - 20,
            );
        }
        if (label.includes("6. Signatures")) {
          doc.text(
            "...................................................",
            x2 + 10,
            rowBottom - 15,
          );
          doc.text(
            "...................................................",
            x3 + 10,
            rowBottom - 15,
          );
        }
      }

      currentY += height;
    }

    // --- ROW 1: Place of Marriage ---
    const placeHeight = 35;
    doc.lineWidth(0.5).rect(x1, currentY, totalW, placeHeight).stroke();
    doc
      .font("Times-Bold")
      .fontSize(10)
      .text("Place of Marriage Ceremony:", x1 + 5, currentY + 5);
    doc.font("Times-Roman").text("", x1 + 150, currentY + 5);
    currentY += placeHeight;

    // --- ROW 2: Header ---
    drawRow("", "Groom", "Bride", 20, "header");

    // --- ROWS 3-8: Standard Details ---
    drawRow("1. Names", "", "", 35);
    drawRow("2. Parents", "", "", 50);
    drawRow("3. Addresses", "", "", 50);
    drawRow("4. Nationality", "", "", 25);
    drawRow("5. Date of Birth", "", "", 25);
    drawRow("6. Signatures", "", "", 40);

    // 7. Wakil (Signature line included via 'wakil' type)
    drawRow("7. Name & Address of Wakil", "", "", 50, "wakil");

    // 8. Dower (Merged right)
    drawRow("8. Dower (Mahar):", "Total: £", "", 30, "merged_right");

    // 9. Witness 1
    drawRow("9. Witness 1\nName & Address:", "", "", 50);

    // 10. Witness 2
    drawRow("10. Witness 2\nName & Address:", "", "", 50);

    // 11. Solemniser
    drawRow("11. Person Solemnising the Marriage", "", "", 40);

    // Footer
    doc
      .fontSize(9)
      .font("Times-Italic")
      .text("Shahjalal Mosque & Islamic Center", 0, 780, {
        align: "center",
        color: "grey",
      });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again later.",
    });
  }
});
// ====================================================
//                START SERVER
// ====================================================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
