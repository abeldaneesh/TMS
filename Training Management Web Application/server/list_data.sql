-- Check number of trainings
SELECT COUNT(*) as training_count FROM Training;

-- List first 5 trainings
SELECT id, title, status FROM Training LIMIT 5;

-- Check number of halls
SELECT COUNT(*) as hall_count FROM Hall;

-- List all halls
SELECT id, name, capacity FROM Hall;
