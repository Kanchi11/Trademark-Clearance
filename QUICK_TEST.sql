-- QUICK TEST - Copy this entire content and paste into Supabase SQL Editor
-- If this works, the SQL Editor can handle the full updates!

-- Test UPDATE (updates ~200 trademark statuses to 'abandoned')
UPDATE uspto_trademarks SET status = 'abandoned'
WHERE serial_number IN (
  '60000001','60000002','60000003','60000004','60000005',
  '60000006','60000007','60000008','60000009','60000010'
);

-- Verify it worked
SELECT
  status,
  COUNT(*) as count
FROM uspto_trademarks
WHERE serial_number IN (
  '60000001','60000002','60000003','60000004','60000005',
  '60000006','60000007','60000008','60000009','60000010'
)
GROUP BY status;
