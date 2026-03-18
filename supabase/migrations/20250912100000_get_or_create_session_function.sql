-- Function to find or create a doctor-patient chat session
-- FIXED VERSION: Accepts TEXT parameters and handles type casting properly
CREATE OR REPLACE FUNCTION get_or_create_doctor_patient_session(
    p_doctor_id TEXT,  -- Changed to TEXT to handle string inputs
    p_patient_id TEXT  -- Changed to TEXT to handle string inputs
)
RETURNS TABLE (session_id UUID) AS $$
DECLARE
    v_session_id UUID;
    v_doctor_uuid UUID;
    v_patient_uuid UUID;
BEGIN
    -- Convert text parameters to UUID with proper error handling
    BEGIN
        v_doctor_uuid := p_doctor_id::UUID;
        v_patient_uuid := p_patient_id::UUID;
    EXCEPTION
        WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'Invalid UUID format for doctor_id: % or patient_id: %', p_doctor_id, p_patient_id;
    END;

    -- Validate that doctor and patient IDs are different
    IF v_doctor_uuid = v_patient_uuid THEN
        RAISE EXCEPTION 'Doctor and patient IDs cannot be the same';
    END IF;

    -- Try to find an existing session between the two participants
    SELECT id INTO v_session_id
    FROM public.chat_sessions
    WHERE session_type = 'doctor-patient'
      AND ((participant_1_id = v_doctor_uuid AND participant_2_id = v_patient_uuid)
        OR (participant_1_id = v_patient_uuid AND participant_2_id = v_doctor_uuid))
    LIMIT 1;

    -- If a session is found, return its ID
    IF v_session_id IS NOT NULL THEN
        RETURN QUERY SELECT v_session_id;
        RETURN;
    END IF;

    -- If no session is found, create a new one
    INSERT INTO public.chat_sessions (participant_1_id, participant_2_id, session_type, title)
    VALUES (v_doctor_uuid, v_patient_uuid, 'doctor-patient', 'Doctor-Patient Chat')
    RETURNING id INTO v_session_id;

    -- Return the new session ID
    RETURN QUERY SELECT v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
