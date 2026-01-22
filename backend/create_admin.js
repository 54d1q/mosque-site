const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const path = require("path");

// FIX: Look for .env in the CURRENT folder (backend), not the root
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

// Debug check
if (!process.env.TEST_ADMIN_PASSWORD) {
  console.error("❌ ERROR: Still cannot find .env file!");
  console.error("Looking for file at:", path.resolve(__dirname, ".env"));
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function createAdmin() {
  const email = process.env.TEST_MOSQUE_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;
  const username = process.env.TEST_ADMIN;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (username, password_hash, role, email) VALUES ($1, $2, 'admin', $3)`,
      [username, hashedPassword, email]
    );

    console.log(`✅ Admin registered: ${username} (${email})`);
  } catch (err) {
    console.error("Error (Admin might already exist):", err.message);
  } finally {
    pool.end();
  }
}

createAdmin();
