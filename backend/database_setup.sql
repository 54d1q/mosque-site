CREATE TABLE IF NOT EXISTS public.users
(
    id SERIAL PRIMARY KEY,
    username character varying(50) NOT NULL UNIQUE,
    password_hash character varying(255) NOT NULL,
    role character varying(20) NOT NULL CHECK (role IN ('admin', 'teacher')),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_class character varying(50),
    email character varying(255) UNIQUE,
    reset_token character varying(255),
    reset_expires bigint
);

CREATE TABLE IF NOT EXISTS public.levels
(
    id SERIAL PRIMARY KEY,
    name character varying(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.teacher_levels
(
    teacher_id integer NOT NULL,
    level_id integer NOT NULL,
    CONSTRAINT teacher_levels_pkey PRIMARY KEY (teacher_id, level_id),
    CONSTRAINT teacher_levels_level_id_fkey FOREIGN KEY (level_id)
        REFERENCES public.levels (id) ON DELETE CASCADE,
    CONSTRAINT teacher_levels_teacher_id_fkey FOREIGN KEY (teacher_id)
        REFERENCES public.users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.students
(
    id SERIAL PRIMARY KEY,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    gender character varying(10) CHECK (gender IN ('Boy', 'Girl')),
    level character varying(255),
    enrolled_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    parent_name character varying(100),
    email character varying(100),
    phone character varying(20),
    sem1_score numeric(5,2) DEFAULT 0,
    sem2_score numeric(5,2) DEFAULT 0,
    sem3_score numeric(5,2) DEFAULT 0,
    final_grade numeric(5,2) DEFAULT 0,
    address_line1 text,
    city text,
    postcode text,
    dob date,
    home_phone character varying(50),
    emergency_phone character varying(50),
    medical_info text,
    doctor_info text,
    status character varying(20) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS public.attendance
(
    id SERIAL PRIMARY KEY,
    student_id integer,
    date date DEFAULT CURRENT_DATE,
    status character varying(20) CHECK (status IN ('Present', 'Absent')),
    recorded_by integer,
    CONSTRAINT attendance_student_id_date_key UNIQUE (student_id, date),
    CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id)
        REFERENCES public.students (id)
);

CREATE TABLE IF NOT EXISTS public.fees
(
    id SERIAL PRIMARY KEY,
    student_id integer,
    month character varying(20) NOT NULL,
    year integer NOT NULL,
    amount numeric(10,2) DEFAULT 0.00,
    is_paid boolean DEFAULT false,
    paid_date timestamp without time zone,
    CONSTRAINT fees_student_id_month_year_key UNIQUE (student_id, month, year),
    CONSTRAINT fees_student_id_fkey FOREIGN KEY (student_id)
        REFERENCES public.students (id)
);

CREATE TABLE IF NOT EXISTS public.exam_results
(
    id SERIAL PRIMARY KEY,
    student_id integer,
    academic_year character varying(20) NOT NULL,
    sem1_score numeric(5,2) DEFAULT 0,
    sem2_score numeric(5,2) DEFAULT 0,
    sem3_score numeric(5,2) DEFAULT 0,
    final_grade numeric(5,2) DEFAULT 0,
    hifz_sem1_start integer DEFAULT 0,
    hifz_sem1_end integer DEFAULT 0,
    hifz_sem1_score numeric(10,2) DEFAULT 0,
    hifz_sem2_start integer DEFAULT 0,
    hifz_sem2_end integer DEFAULT 0,
    hifz_sem2_score numeric(10,2) DEFAULT 0,
    hifz_sem3_start integer DEFAULT 0,
    hifz_sem3_end integer DEFAULT 0,
    hifz_sem3_score numeric(10,2) DEFAULT 0,
    hifz_rev_s1_start integer DEFAULT 0,
    hifz_rev_s1_end integer DEFAULT 0,
    hifz_rev_s1_score numeric(10,2) DEFAULT 0,
    hifz_rev_s2_start integer DEFAULT 0,
    hifz_rev_s2_end integer DEFAULT 0,
    hifz_rev_s2_score numeric(10,2) DEFAULT 0,
    hifz_rev_s3_start integer DEFAULT 0,
    hifz_rev_s3_end integer DEFAULT 0,
    hifz_rev_s3_score numeric(10,2) DEFAULT 0,
    total_hifz_score numeric(10,2) DEFAULT 0,
    CONSTRAINT exam_results_student_id_academic_year_key UNIQUE (student_id, academic_year),
    CONSTRAINT exam_results_student_id_fkey FOREIGN KEY (student_id)
        REFERENCES public.students (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.faqs
(
    id SERIAL PRIMARY KEY,
    question text NOT NULL,
    answer text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.notices
(
    id SERIAL PRIMARY KEY,
    title character varying(255) NOT NULL,
    message text,
    event_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.gallery
(
    id SERIAL PRIMARY KEY,
    image_url text NOT NULL,
    caption text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category character varying(50) DEFAULT 'gallery'
);

CREATE TABLE IF NOT EXISTS public.videos
(
    id SERIAL PRIMARY KEY,
    title text NOT NULL,
    video_url text NOT NULL,
    summary text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.login_logs
(
    id SERIAL PRIMARY KEY,
    teacher_id integer,
    login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT login_logs_teacher_id_fkey FOREIGN KEY (teacher_id)
        REFERENCES public.users (id)
);

CREATE TABLE IF NOT EXISTS public.admissions
(
    id SERIAL PRIMARY KEY,
    first_name character varying(100),
    last_name character varying(100),
    dob date,
    gender character varying(20),
    address_line1 text,
    city character varying(50),
    postcode character varying(20),
    parent_name character varying(100),
    home_phone character varying(50),
    mobile_phone character varying(50),
    emergency_phone character varying(50),
    email character varying(100),
    medical_info text,
    doctor_info text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    level character varying(50)
);
