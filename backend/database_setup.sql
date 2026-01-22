-- 1. Create Users Table (Headteacher & Teachers)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Students Table
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Boy', 'Girl')),
    student_level INTEGER CHECK (student_level BETWEEN 1 AND 6),
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. Create Attendance Table
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) CHECK (status IN ('Present', 'Absent', 'Late')),
    marked_by INTEGER REFERENCES users(id) -- The teacher who marked it
);

-- 4. Create Fees Table
CREATE TABLE fees (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    month VARCHAR(20) NOT NULL, -- e.g., 'January'
    year INTEGER NOT NULL,      -- e.g., 2025
    is_paid BOOLEAN DEFAULT FALSE,
    amount DECIMAL(10, 2),
    paid_date TIMESTAMP
);

-- 5. Insert a default Admin (Headteacher) so you can log in later
-- Note: The password hash here is for "password123" (generated via bcrypt)
INSERT INTO users (username, password_hash, role) 
VALUES ('headteacher', '$2b$10$w/..hashedpasswordplaceholder...', 'admin');