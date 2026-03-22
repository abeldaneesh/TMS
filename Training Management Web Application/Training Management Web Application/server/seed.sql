-- Seed Data for Training Management System
-- Password for all users: "password123"
-- Hash: $2b$10$dICwnjCv9tj6RbnnbA3CpOMViALtjGbb5thxSmHnarPJPJmXVLcZy

-- 1. Institutions
INSERT INTO Institution (id, name, type, location, createdAt) VALUES
('inst-1', 'District General Hospital', 'Hospital', 'Main City Center', NOW()),
('inst-2', 'Community Health Center - North', 'CHC', 'North Zone', NOW()),
('inst-3', 'Primary Health Center - East', 'PHC', 'East Zone', NOW()),
('inst-4', 'Primary Health Center - West', 'PHC', 'West Zone', NOW()),
('inst-5', 'Urban Health Center - South', 'UHC', 'South Zone', NOW());

-- 2. Users
INSERT INTO User (id, name, email, password, role, institutionId, designation, phone, department, createdAt) VALUES
('user-1', 'Dr. Admin Kumar', 'admin@dmo.gov', '$2b$10$dICwnjCv9tj6RbnnbA3CpOMViALtjGbb5thxSmHnarPJPJmXVLcZy', 'master_admin', NULL, 'DMO Administrator', '+91-9876543210', NULL, NOW()),
('user-2', 'Dr. Priya Sharma', 'priya@dmo.gov', '$2b$10$dICwnjCv9tj6RbnnbA3CpOMViALtjGbb5thxSmHnarPJPJmXVLcZy', 'program_officer', NULL, 'Senior Program Officer', '+91-9876543211', NULL, NOW()),
('user-3', 'Dr. Rajesh Verma', 'rajesh@dmo.gov', '$2b$10$dICwnjCv9tj6RbnnbA3CpOMViALtjGbb5thxSmHnarPJPJmXVLcZy', 'program_officer', NULL, 'Program Officer', '+91-9876543212', NULL, NOW()),
('user-4', 'Dr. Anjali Patel', 'anjali@hospital1.gov', '$2b$10$dICwnjCv9tj6RbnnbA3CpOMViALtjGbb5thxSmHnarPJPJmXVLcZy', 'institutional_admin', 'inst-1', 'Medical Superintendent', '+91-9876543213', NULL, NOW()),
('user-5', 'Dr. Suresh Reddy', 'suresh@hospital2.gov', '$2b$10$dICwnjCv9tj6RbnnbA3CpOMViALtjGbb5thxSmHnarPJPJmXVLcZy', 'institutional_admin', 'inst-2', 'Hospital Administrator', '+91-9876543214', NULL, NOW()),
('user-6', 'Nurse Kavita Singh', 'kavita@hospital1.gov', '$2b$10$dICwnjCv9tj6RbnnbA3CpOMViALtjGbb5thxSmHnarPJPJmXVLcZy', 'participant', 'inst-1', 'Staff Nurse', '+91-9876543215', 'General Ward', NOW()),
('user-7', 'Dr. Amit Desai', 'amit@hospital1.gov', '$2b$10$dICwnjCv9tj6RbnnbA3CpOMViALtjGbb5thxSmHnarPJPJmXVLcZy', 'participant', 'inst-1', 'Medical Officer', '+91-9876543216', 'Emergency', NOW()),
('user-8', 'Pharmacist Meera Nair', 'meera@hospital2.gov', '$2b$10$dICwnjCv9tj6RbnnbA3CpOMViALtjGbb5thxSmHnarPJPJmXVLcZy', 'participant', 'inst-2', 'Pharmacist', '+91-9876543217', 'Pharmacy', NOW()),
('user-9', 'Lab Technician Ramesh', 'ramesh@phc1.gov', '$2b$10$dICwnjCv9tj6RbnnbA3CpOMViALtjGbb5thxSmHnarPJPJmXVLcZy', 'participant', 'inst-3', 'Lab Technician', '+91-9876543218', 'Laboratory', NOW()),
('user-10', 'Dr. Lakshmi Iyer', 'lakshmi@hospital1.gov', '$2b$10$dICwnjCv9tj6RbnnbA3CpOMViALtjGbb5thxSmHnarPJPJmXVLcZy', 'participant', 'inst-1', 'Senior Medical Officer', '+91-9876543219', 'Pediatrics', NOW());

-- 3. Halls
INSERT INTO Hall (id, name, location, capacity, createdAt) VALUES
('hall-1', 'Main Conference Hall', 'DMO Building - Ground Floor', 100, NOW()),
('hall-2', 'Training Room A', 'DMO Building - First Floor', 50, NOW()),
('hall-3', 'Training Room B', 'DMO Building - First Floor', 40, NOW()),
('hall-4', 'Auditorium', 'District Hospital Campus', 200, NOW()),
('hall-5', 'Community Hall', 'CHC North Campus', 75, NOW());

-- 4. Trainings
INSERT INTO Training (id, title, description, program, date, startTime, endTime, hallId, capacity, trainerId, createdById, status, createdAt) VALUES
('train-1', 'Emergency Response & First Aid', 'Comprehensive training on emergency medical response and first aid procedures.', 'Emergency Medicine', '2026-02-15 00:00:00', '09:00', '17:00', 'hall-1', 80, 'user-2', 'user-2', 'scheduled', NOW()),
('train-2', 'Infection Control & Prevention', 'Training on hospital infection control practices.', 'Infection Control', '2026-02-20 00:00:00', '10:00', '16:00', 'hall-2', 45, 'user-3', 'user-3', 'scheduled', NOW()),
('train-3', 'Maternal & Child Health Care', 'Best practices in maternal and child healthcare.', 'MCH Program', '2026-02-10 00:00:00', '09:30', '15:30', 'hall-4', 150, 'user-2', 'user-2', 'scheduled', NOW()),
('train-4', 'Digital Health Records Management', 'Training on electronic health records systems.', 'Digital Health', '2026-01-25 00:00:00', '10:00', '14:00', 'hall-3', 30, 'user-3', 'user-3', 'completed', NOW()),
('train-5', 'Tuberculosis Management & DOTS', 'Training on TB diagnosis and DOTS implementation.', 'TB Control Program', '2026-03-05 00:00:00', '09:00', '16:00', 'hall-2', 40, 'user-2', 'user-2', 'scheduled', NOW()),
('train-6', 'Mental Health First Aid', 'Recognizing mental health issues and providing support.', 'Mental Health', '2026-02-25 00:00:00', '10:00', '15:00', 'hall-5', 60, 'user-3', 'user-3', 'scheduled', NOW());

-- 5. Nominations
INSERT INTO Nomination (id, trainingId, participantId, institutionId, status, nominatedBy, nominatedAt, approvedBy, approvedAt, rejectionReason) VALUES
('nom-1', 'train-1', 'user-6', 'inst-1', 'approved', 'user-4', NOW(), 'user-2', NOW(), NULL),
('nom-2', 'train-1', 'user-7', 'inst-1', 'approved', 'user-4', NOW(), 'user-2', NOW(), NULL),
('nom-3', 'train-1', 'user-8', 'inst-2', 'approved', 'user-5', NOW(), 'user-2', NOW(), NULL),
('nom-4', 'train-2', 'user-6', 'inst-1', 'nominated', 'user-4', NOW(), NULL, NULL, NULL),
('nom-5', 'train-2', 'user-10', 'inst-1', 'approved', 'user-4', NOW(), 'user-3', NOW(), NULL),
('nom-6', 'train-3', 'user-6', 'inst-1', 'approved', 'user-4', NOW(), 'user-2', NOW(), NULL),
('nom-7', 'train-3', 'user-7', 'inst-1', 'approved', 'user-4', NOW(), 'user-2', NOW(), NULL),
('nom-8', 'train-3', 'user-8', 'inst-2', 'rejected', 'user-5', NOW(), 'user-2', NOW(), 'Capacity full'),
('nom-9', 'train-4', 'user-7', 'inst-1', 'attended', 'user-4', NOW(), 'user-3', NOW(), NULL),
('nom-10', 'train-4', 'user-8', 'inst-2', 'attended', 'user-5', NOW(), 'user-3', NOW(), NULL);

-- 6. Attendance
INSERT INTO Attendance (id, trainingId, participantId, timestamp, method, qrData) VALUES
('att-1', 'train-4', 'user-7', '2026-01-25 10:15:00', 'qr', 'QR_train-4_session-1_user-7'),
('att-2', 'train-4', 'user-8', '2026-01-25 10:18:00', 'qr', 'QR_train-4_session-1_user-8');
