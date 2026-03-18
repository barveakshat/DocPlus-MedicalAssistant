# Doc+ Functionality Updates (March 2026)

This document summarizes the functional changes implemented recently across doctor and patient workflows.

## 1) Doctor ↔ Patient Chat Improvements

### 1.1 Read receipts and unread visibility
- Added read receipt labels for sent messages (`Sent` / `Read`) in doctor-patient chat bubbles.
- Added unread count badge in chat header.
- Wired auto mark-as-read behavior when opening/reading a session.

### 1.2 Better chat authoring for doctors
- Added one-click doctor message templates:
  - “Please upload your latest reports...”
  - “Please book a follow-up...”
  - “Kindly monitor your symptoms...”
  - “Please continue current medication...”

### 1.3 One-click SOAP summary
- Added “Summarize to SOAP” action for doctors in doctor-patient chat.
- Generates structured SOAP note (Subjective, Objective, Assessment, Plan) using AI.
- Added copy-to-clipboard button for quick handoff/documentation.

### 1.4 Chat UI space utilization and recipient bubble styling
- Expanded doctor and patient chat pages to use more screen width and height.
- Reduced unused side whitespace by removing restrictive max-width wrappers in doctor-patient chat pages.
- Increased message bubble width usage.
- Updated recipient/incoming message bubble background for clearer contrast.

### 1.5 Dynamic chat date label
- Replaced static hardcoded date text in AI chat with dynamic current-date label.

## 2) Patient List and Status Logic (Doctor View)

### 2.1 Replaced mock patient status logic
- Removed random status derivation.
- Status now uses real signals:
  - unread incoming message count
  - time since last message
  - missing profile field count

### 2.2 Added practical patient table signals
- Unread badge (`x new`) on patient row.
- Last-message age display (e.g., `5h ago`, `2d ago`).
- Quick note column.
- Follow-up date tag column.

## 3) Patient Detail Workflow Enhancements

### 3.1 Fixed doctor “Start Chat” route
- Updated patient detail chat action to route into existing doctor chat flow with navigation state.

### 3.2 Added editable care fields for doctor
- Added editable section on patient detail for:
  - Quick notes (`doctor_quick_notes`)
  - Care plan (`care_plan`)
  - Follow-up date (`follow_up_date`)
- Added save action with success/error feedback.

## 4) Patient Portal Enhancements

### 4.1 “My Care Plan” card
- Added patient-facing care plan card in patient-doctor chat screen.
- Shows doctor instructions (`care_plan`) and next follow-up date.

## 5) Profile UX Improvement (No full page reload)

### 5.1 Auth context refresh support
- Added `refreshProfile()` in auth context.
- Replaced hard page reload after profile save with context-level refresh.
- Applied to both doctor and patient profile dialogs for smoother UX.

## 6) Database and Type Updates

### 6.1 New patient columns
Added to `public.patients`:
- `doctor_quick_notes` (text)
- `care_plan` (text)
- `follow_up_date` (date)

### 6.2 Migration details
- Migration file: `supabase/migrations/20260319090000_add_patient_care_plan_notes_followup.sql`
- Applied to remote Supabase project (`Doc+` / `azjhqasjbrujfddbzxqw`) via MCP.

### 6.3 Frontend generated types updated
- Updated `src/integrations/supabase/types.ts` to include new patient fields in `Row`, `Insert`, and `Update`.

## 7) MCP Configuration Update

- Added workspace MCP config for Supabase in `.vscode/mcp.json`:
  - server name: `supabase`
  - endpoint: `https://mcp.supabase.com/mcp?project_ref=azjhqasjbrujfddbzxqw`

## 8) Files Updated (Functional Areas)

### Chat/UI
- `src/components/DoctorPatientChatWindow.tsx`
- `src/components/ChatWindow.tsx`
- `src/pages/DoctorChat.tsx`
- `src/pages/PatientDoctorChat.tsx`

### Patient management
- `src/pages/Patients.tsx`
- `src/pages/PatientDetail.tsx`

### Profile/Auth
- `src/components/DoctorProfile.tsx`
- `src/components/PatientProfile.tsx`
- `src/contexts/AuthContext.tsx`

### Database/Types/Config
- `supabase/migrations/20260319090000_add_patient_care_plan_notes_followup.sql`
- `src/integrations/supabase/types.ts`
- `.vscode/mcp.json`

## 9) Validation Performed

- Multiple successful production builds via `npm run build` after updates.
- Supabase schema verification confirmed new columns exist on `public.patients`.

---

If this should be converted into a formal `CHANGELOG.md` format (`Added`, `Changed`, `Fixed`, `Migration`), this document can be adapted directly.
