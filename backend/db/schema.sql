-- Healthcare Portal schema
-- Matches the ERD agreed in planning (healthcare_portal_schema.drawio)

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'patient')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctors (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name       VARCHAR(255) NOT NULL,
    gender          VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    phone           VARCHAR(30),
    specialization  VARCHAR(255),
    license_number  VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS patients (
    id                  SERIAL PRIMARY KEY,
    full_name           VARCHAR(255) NOT NULL,
    dob                 DATE,
    aadhar              VARCHAR(20),          -- VULNERABLE (A04): stored in plaintext, intentional
    phone               VARCHAR(30),
    address             VARCHAR(255),
    gender              VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    patient_status      VARCHAR(20) NOT NULL CHECK (patient_status IN ('new', 'in-progress', 'closed','reopened')),
    assigned_doctor_id  INTEGER REFERENCES doctors(id)
);

CREATE TABLE IF NOT EXISTS medical_notes (
    id          SERIAL PRIMARY KEY,
    patient_id  INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id   INTEGER NOT NULL REFERENCES doctors(id),
    content     TEXT NOT NULL,                -- VULNERABLE (A05): rendered unsanitized client-side later
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_results (
    id                  SERIAL PRIMARY KEY,
    patient_id          INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    external_lab_url    VARCHAR(500),         -- VULNERABLE (A01/SSRF): fetched server-side later
    result_data         JSONB,
    fetched_at          TIMESTAMP
);

CREATE TABLE IF NOT EXISTS imported_records (
    id            SERIAL PRIMARY KEY,
    imported_by   INTEGER NOT NULL REFERENCES users(id),
    raw_payload   JSONB NOT NULL,             -- VULNERABLE (A08): deserialized without signature check later
    imported_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL,        -- VULNERABLE (A06): predictable generation later
    expires_at  TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER REFERENCES users(id),
    action              VARCHAR(255) NOT NULL,
    target_patient_id   INTEGER REFERENCES patients(id),
    timestamp           TIMESTAMP NOT NULL DEFAULT NOW(),
    success             BOOLEAN NOT NULL DEFAULT TRUE
    -- VULNERABLE (A09): writes to this table are intentionally sparse/missing in early phases
);

CREATE INDEX IF NOT EXISTS idx_patients_assigned_doctor ON patients(assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_notes_patient ON medical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_patient ON lab_results(patient_id);
