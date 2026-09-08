-- Sample data for local development.
-- Password for every seeded user is: Password123!
-- (hash below is unsalted sha256 of that string — see auth.controller.js note on why)

INSERT INTO users (email, password_hash, role) VALUES
('admin@clinic.test',   'a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea', 'admin'),
('dr.reyes@clinic.test','a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea', 'doctor'),
('dr.akashpatel@clinic.test','a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea', 'doctor'),
('dr.sarahlilly@clinic.test','a109e36947ad56de1dca1cc49f0ef8ac9ad9a7b1aa0df41fb3c4cb73c1ff01ea', 'doctor');


INSERT INTO doctors (user_id, full_name, specialization, license_number,gender,phone ) VALUES
((SELECT id FROM users WHERE email = 'dr.reyes@clinic.test'), 'Dr. Maria Reyes', 'Internal Medicine', 'LIC-48213','Female','9845612310'),
((SELECT id FROM users WHERE email = 'dr.akashpatel@clinic.test'), 'Dr. Akash Patel', 'Cardiology', 'LIC-59324','Male','8745120369'),
((SELECT id FROM users WHERE email = 'dr.sarahlilly@clinic.test'), 'Dr. Sarah Lilly', 'Pediatrics', 'LIC-60435','Female','7415829603');
