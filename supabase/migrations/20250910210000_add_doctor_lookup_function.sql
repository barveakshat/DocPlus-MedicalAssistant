-- Create a function to get doctor by Clerk user ID (bypasses RLS)
CREATE OR REPLACE FUNCTION get_doctor_by_clerk_id(clerk_id TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  name TEXT,
  registration_no TEXT,
  specialization TEXT,
  experience INTEGER,
  qualifications TEXT,
  hospital_affiliation TEXT,
  contact_number TEXT,
  clerk_user_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.user_id,
    d.username,
    d.name,
    d.registration_no,
    d.specialization,
    d.experience,
    d.qualifications,
    d.hospital_affiliation,
    d.contact_number,
    d.clerk_user_id,
    d.created_at,
    d.updated_at
  FROM public.doctors d
  WHERE d.clerk_user_id = clerk_id;
END;
$$;
