# DocPlus Medical Assistant — Feature Documentation

> Last updated: March 2026
> This document covers all features implemented in the platform expansion sprint.

---

## Table of Contents

1. [In-App Notification Bell](#1-in-app-notification-bell)
2. [Lab Metrics Persistence & History](#2-lab-metrics-persistence--history)
3. [Patient Document Upload](#3-patient-document-upload)
4. [Doctor Dashboard — Follow-up Calendar](#4-doctor-dashboard--follow-up-calendar)
5. [Configurable Doctor Message Templates](#5-configurable-doctor-message-templates)
6. [Appointment Scheduling Module](#6-appointment-scheduling-module)
7. [Prescription Management Module](#7-prescription-management-module)
8. [Lab Results Timeline & Trend Charts](#8-lab-results-timeline--trend-charts)
9. [Chronic Disease Programs](#9-chronic-disease-programs)
10. [AI Risk Profile Panel](#10-ai-risk-profile-panel)
11. [Medication Adherence Tracking](#11-medication-adherence-tracking)
12. [AI Symptom Triage Wizard](#12-ai-symptom-triage-wizard)
13. [FHIR R4 EHR Export & Import](#13-fhir-r4-ehr-export--import)

---

## 1. In-App Notification Bell

**Who:** Doctors & Patients
**Where:** Top-right corner of the dashboard header

### What it does
A bell icon with an unread count badge that shows real-time in-app notifications. When a new notification arrives while you are on any page, a toast preview slides in from the bottom-right.

### Notification types
| Type | Triggered by | Who receives |
|------|-------------|--------------|
| `new_message` | A new chat message is sent | The recipient of the message |
| `appointment_confirmed` / `appointment_cancelled` | Appointment status changes | The patient |
| `prescription_issued` | A new prescription is created | The patient |
| `abnormal_lab` | A vital log value falls outside program targets | The doctor |

### How to use
- Click the **bell icon** to open the notification panel
- Click any notification to navigate to the linked page; it is automatically marked as read
- Click **Mark all read** to clear the unread count
- Click **✕** on individual notifications to dismiss them
- Live toast previews appear automatically — no action needed

### Database
Table: `notifications` — columns: `user_id`, `type`, `title`, `body`, `link`, `is_read`, `created_at`

---

## 2. Lab Metrics Persistence & History

**Who:** Doctors (Clinical Modules)
**Where:** Clinical Modules → Lab History tab

### What it does
When a doctor uploads and processes a patient report in Clinical Modules, the extracted metrics (glucose, HbA1c, systolic/diastolic BP, hemoglobin, etc.) are automatically saved to the `lab_metrics` table in Supabase. This builds a persistent history that persists across sessions.

### Lab History Tab
The **Lab History** tab in Clinical Modules shows:
- A **line chart per metric type** with historical readings over time
- Reference range overlays (normal range shown as a shaded band)
- **Red dots** on abnormal readings
- A table of the 30 most recent readings
- Colour-coded metric lines (glucose=blue, BP=red/orange, HbA1c=purple, etc.)

### How to use
1. In **Clinical Modules**, select a patient from the dropdown
2. Upload a lab report PDF or image in the **Reports** tab
3. The metrics are automatically extracted and saved
4. Switch to the **Lab History** tab to view the trends
5. Hover over chart points to see exact values and dates

### Database
Table: `lab_metrics` — columns: `patient_id`, `metric_type`, `metric_label`, `value`, `unit`, `reference_range`, `abnormal`, `source_document`, `recorded_at`

---

## 3. Patient Document Upload

**Who:** Patients
**Where:** Sidebar → My Records

### What it does
Patients can upload their own medical documents (lab reports, prescriptions, discharge summaries, etc.) directly to their secure storage space. Files are stored in the Supabase `chat-attachments` bucket under `patient-records/{patientId}/`.

### How to use
1. Navigate to **My Records** in the patient sidebar
2. Click **Upload Files** and select one or more files (PDF, images, etc.)
3. A progress bar shows the upload status
4. Uploaded files appear in the list with their name, size, and upload date
5. Click the **download icon** to retrieve a file
6. Click the **trash icon** to delete a file

---

## 4. Doctor Dashboard — Follow-up Calendar

**Who:** Doctors
**Where:** Dashboard → Upcoming Follow-ups section

### What it does
Replaces the mock schedule on the doctor dashboard with a real list of patients who have upcoming follow-up dates set (within the next 14 days), sorted by soonest first.

### Visual indicators
| Label | Colour | Meaning |
|-------|--------|---------|
| Overdue | Red | Follow-up date has passed |
| Today | Amber | Follow-up is today |
| Tomorrow | Blue | Follow-up is tomorrow |
| In N days | Slate | Follow-up in 2–14 days |

### How to use
- The section appears automatically when patients have follow-up dates set
- Click a patient row to navigate directly to their **Patient Detail** page
- Set follow-up dates from the **Patient Detail** page → Doctor Notes & Care Plan section

---

## 5. Configurable Doctor Message Templates

**Who:** Doctors
**Where:** Doctor-Patient Chat → quick reply template panel

### What it does
Doctors can save, edit, and delete their own quick-reply message templates stored in the database. Four default templates are seeded on first use.

### Default templates
1. "Please upload your latest lab reports and prescription photos..."
2. "Please book a follow-up appointment for next week..."
3. "Please monitor your symptoms and report any worsening..."
4. "Please continue your current medication as prescribed..."

### How to use
**Using a template:**
- Open a patient chat
- Click any template in the right panel to instantly paste it into the message box

**Adding a template:**
1. Click the **+ Add** button at the bottom of the templates panel
2. Type the template text in the input field that appears
3. Press **Save**

**Deleting a template:**
- Hover over any template to reveal the **trash icon**
- Click it to permanently delete

### Database
Table: `doctor_templates` — columns: `doctor_user_id`, `content`, `sort_order`

---

## 6. Appointment Scheduling Module

**Who:** Doctors & Patients
**Where:** Sidebar → Appointments

### What it does
A full appointment management system. Doctors can book and manage appointments for their patients. Patients can view their scheduled appointments.

### Doctor workflow
1. Click **New Appointment**
2. Select the patient from the dropdown
3. Choose date and time, appointment type (In-Person or Phone/Video), duration, and optional notes
4. Click **Book** — the patient receives an in-app notification
5. From the appointment card, use the action buttons to:
   - **Confirm** a pending appointment
   - **Complete** an appointment after it occurs
   - **Cancel** an appointment

### Patient workflow
- Patients see their Upcoming and Past appointments listed
- Status changes (confirmed, cancelled) trigger in-app notifications

### Appointment statuses
`pending` → `confirmed` → `completed` | `cancelled`

### Database
Tables: `appointments`, `doctor_availability`

---

## 7. Prescription Management Module

**Who:** Doctors & Patients
**Where:** Sidebar → Prescriptions

### What it does
Doctors can issue structured prescriptions to patients. Patients see their current and past prescriptions and can log when they take their doses.

### Doctor workflow
1. Click **New Prescription**
2. Select the patient, enter drug name, dose, frequency, and duration
3. Add optional instructions (e.g. "Take with food")
4. Click **Issue Prescription** — the patient receives an in-app notification
5. From the card use **✓** (mark completed) or **✗** (discontinue) buttons

### Patient workflow
- **Active** prescriptions appear at the top
- Click **Log Dose** to record that you took the medication today
- A **"Taken today"** badge appears once logged for the day
- Past prescriptions are shown below in a dimmed section
- **Print** button generates a formatted prescription printout

### Database
Table: `prescriptions` — columns: `doctor_user_id`, `patient_user_id`, `drug_name`, `dose`, `frequency`, `duration`, `instructions`, `status`, `issued_at`

---

## 8. Lab Results Timeline & Trend Charts

**Who:** Doctors
**Where:** Clinical Modules → Lab History tab

> See [Lab Metrics Persistence & History](#2-lab-metrics-persistence--history) for full details.

### Reference ranges used for chart overlays
| Metric | Normal Range |
|--------|-------------|
| Glucose (fasting) | 70 – 99 mg/dL |
| HbA1c | 4.0 – 5.6 % |
| Systolic BP | 90 – 120 mmHg |
| Diastolic BP | 60 – 80 mmHg |
| Hemoglobin (adult) | 12 – 17 g/dL |
| Weight | — (no fixed range) |
| Heart Rate | 60 – 100 bpm |

---

## 9. Chronic Disease Programs

**Who:** Doctors (enrol patients) & Patients (log vitals)
**Where:** Sidebar → Disease Programs

### What it does
Structured monitoring programs for chronic conditions. Doctors enrol patients with defined target metric ranges. Patients log their vitals. If a logged value falls outside the target range, the doctor receives an in-app notification.

### Program presets
| Program | Metrics tracked |
|---------|----------------|
| Diabetes Management | Blood Glucose (70–140 mg/dL), HbA1c (0–7%) |
| Hypertension Management | Systolic BP (90–130 mmHg), Diastolic BP (60–80 mmHg) |
| Custom | Doctor-defined metrics |

### Doctor workflow
1. Click **Enrol Patient**
2. Select the patient, choose a program type, set the name and check-in frequency (daily/weekly)
3. Click **Enrol** — the program appears in the patient's view immediately

### Patient workflow
1. Open **My Programs** in the sidebar
2. Find an active program and click **Log Vital**
3. Select the metric type, enter the reading value, and add optional notes
4. Click **Save Reading**
5. If the value is outside the target range, the doctor is notified automatically

### Database
Tables: `disease_programs` (with `target_metrics` JSONB), `vital_logs`

---

## 10. AI Risk Profile Panel

**Who:** Doctors
**Where:** Clinical Modules → CDS (Clinical Decision Support) panel → bottom section

### What it does
An AI-powered risk assessment using Mistral-7B that analyses the patient's entered symptoms, medications, and uploaded lab metrics to produce a structured risk profile across three categories.

### Risk categories
| Category | What it assesses |
|----------|----------------|
| Cardiovascular | Heart disease, hypertension, stroke risk based on BP and symptoms |
| Diabetic | Diabetic complications, glycaemic control based on glucose/HbA1c |
| Medication | Drug interaction risks, contraindications based on medication list |

### Risk levels
- **Low** — green badge, no immediate concerns
- **Medium** — amber badge, monitor closely
- **High** — red badge, consider intervention

### How to use
1. In Clinical Modules, select a patient
2. Open the **CDS** tab
3. Enter symptoms, medications (comma-separated), and symptom duration in the input fields at the top
4. Scroll to the **AI Risk Profile** section at the bottom
5. Click **Generate**
6. Wait 5–15 seconds for the AI response
7. The risk levels and explanations appear below, with a one-line clinical summary

> **Note:** This is a decision support tool only. Final clinical decisions remain with the treating clinician.

---

## 11. Medication Adherence Tracking

**Who:** Patients (log doses) & Doctors (view adherence)
**Where:** Patients → Prescriptions page | Doctors → Patient Detail page

### What it does
Patients log each dose they take. The doctor sees a per-prescription adherence percentage (doses taken vs. doses expected) over the last 30 days.

### Patient workflow
- On the **Prescriptions** page, active prescriptions show a **Log Dose** button
- Tap it once per day after taking the medication
- The button changes to a **"Taken today"** badge for the rest of the day
- The button reappears the next day

### Doctor view
On any **Patient Detail** page, a **Medication Adherence (Last 30 Days)** card appears when the patient has active prescriptions:
- Each prescription shows: `X / Y doses · Z%`
- A colour-coded progress bar:
  - **Green** — ≥ 80% adherence
  - **Amber** — 50–79% adherence
  - **Red** — < 50% adherence

### How expected doses are calculated
The system maps prescription frequency to daily dose count:

| Frequency | Doses/day |
|-----------|-----------|
| Once daily | 1 |
| Twice daily | 2 |
| Three times daily | 3 |
| Four times daily | 4 |
| Every 8 hours | 3 |
| Every 12 hours | 2 |
| Before/After meals | 3 |
| At bedtime | 1 |
| As needed | Not tracked |

Expected = doses/day × days since prescription was issued (max 30 days)

### Database
Table: `medication_logs` — columns: `prescription_id`, `patient_user_id`, `taken_at`, `notes`

---

## 12. AI Symptom Triage Wizard

**Who:** Patients
**Where:** Appears automatically when navigating to **My Doctor** chat (once per browser session)

### What it does
A 4-step intake wizard that collects the patient's symptoms before they chat with their doctor. An AI (Mistral-7B) analyses the inputs and classifies the urgency as **Routine**, **Urgent**, or **Emergency**. The result is shown as a banner at the top of the chat screen so both the patient and (when communicated) doctor have context.

### Steps
| Step | What it collects |
|------|----------------|
| 1 — Chief Complaint | Primary symptom or reason for contacting the doctor (free text) |
| 2 — Duration & Severity | How long (6 preset options) + severity slider (1–10) |
| 3 — Associated Symptoms | Checklist of 12 common symptoms (select all that apply) |
| 4 — AI Analysis | Automatic AI triage; shows result with explanation |

### Urgency levels
| Level | Colour | Meaning | Action |
|-------|--------|---------|--------|
| **Emergency** | Red | Potentially life-threatening | Prompted to call emergency services; can still proceed to chat |
| **Urgent** | Amber | Needs prompt attention | Prompted to message doctor immediately |
| **Routine** | Green | Non-urgent concern | Normal chat flow |

### Fallback behaviour
If the AI is unavailable, a rule-based fallback activates:
- Emergency if severity ≥ 9 or "Chest pain" / "Shortness of breath" selected
- Urgent if severity ≥ 6 or "Fever" selected
- Routine otherwise

### Session behaviour
- The wizard appears **once per browser session** (sessionStorage-gated)
- Closing the browser and reopening will show it again on next visit
- A **Skip** link is available if the patient does not want to complete it
- The triage result banner can be dismissed with **✕**

---

## 13. FHIR R4 EHR Export & Import

**Who:** Doctors
**Where:** Export — Patient Detail page | Import — Register New Patient page

### What it does
Enables interoperability with other healthcare systems using the **FHIR R4** (Fast Healthcare Interoperability Resources) standard. Patient records can be exported as a standard JSON bundle and imported from bundles produced by other systems.

---

### Export

**Where:** Patient Detail page → **Export FHIR** button (top-right, next to Start Chat)

**What is exported:**
| FHIR Resource | Content |
|---------------|---------|
| `Patient` | Name, gender, email, phone, address, emergency contact |
| `Observation` | All lab metrics from the `lab_metrics` table, LOINC-coded |
| `MedicationRequest` | All prescriptions with dose, frequency, duration |
| `Condition` | Medical history narrative, allergies |

**LOINC codes used for observations:**
| Metric | LOINC Code |
|--------|-----------|
| Blood Glucose | 2339-0 |
| HbA1c | 4548-4 |
| Systolic BP | 8480-6 |
| Diastolic BP | 8462-4 |
| Hemoglobin | 718-7 |
| Body Weight | 29463-7 |
| Heart Rate | 8867-4 |

**How to use:**
1. Open any **Patient Detail** page
2. Click **Export FHIR**
3. A file named `PatientName_FHIR_R4.json` is downloaded automatically
4. This file can be shared with hospitals, specialists, or other EHR systems

---

### Import

**Where:** Register New Patient page → **Import FHIR** button (top-right)

**What is imported:**
| FHIR Field | Maps to |
|------------|---------|
| Patient name | First name + Last name fields |
| Gender | Gender field |
| Email telecom | Email field |
| Phone telecom | Phone field |
| Address | Address field |
| Medical History condition | Medical History textarea |
| Allergies condition | Allergies textarea |
| Emergency contact name | Emergency Contact Name field |
| Emergency contact phone | Emergency Contact Phone field |

**How to use:**
1. Navigate to **Register New Patient**
2. Click **Import FHIR**
3. Select a `.json` FHIR R4 bundle file from your computer
4. The form fields are pre-filled automatically
5. Review and adjust the imported data
6. Complete registration as normal

> **Note:** The import only pre-fills the registration form — it does not automatically save or create a patient record. You must click the submit/register button after reviewing.

---

## Database Migrations Reference

All new tables were created via the following migration files:

| Migration file | Tables created |
|---------------|---------------|
| `20260319100000_create_lab_metrics.sql` | `lab_metrics` |
| `20260319110000_create_notifications.sql` | `notifications` |
| `20260319120000_notification_triggers.sql` | DB triggers for auto-notifications |
| `20260319130000_create_doctor_templates.sql` | `doctor_templates` |
| `20260319140000_create_appointments.sql` | `appointments`, `doctor_availability` |
| `20260319150000_create_prescriptions.sql` | `prescriptions` |
| `20260319160000_create_chronic_disease_programs.sql` | `disease_programs`, `vital_logs` |
| `20260319170000_create_medication_logs.sql` | `medication_logs` |

All tables have RLS enabled. Policies use `true` (permissive) since the app uses Clerk authentication rather than Supabase Auth — security is enforced at the application layer.

---

## New Files Created

### Components
| File | Purpose |
|------|---------|
| `src/components/NotificationBell.tsx` | Bell icon + popover notification panel |
| `src/components/LabHistoryPanel.tsx` | Lab metrics trend charts (Recharts) |
| `src/components/SymptomTriageWizard.tsx` | 4-step AI symptom intake wizard |

### Pages
| File | Purpose |
|------|---------|
| `src/pages/Appointments.tsx` | Appointment scheduling (doctor + patient) |
| `src/pages/Prescriptions.tsx` | Prescription management (doctor + patient) |
| `src/pages/DiseasePrograms.tsx` | Chronic disease program enrolment + vital logging |
| `src/pages/PatientMyRecords.tsx` | Patient document upload + management |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useNotifications.ts` | Real-time notification state management |
| `src/hooks/useDoctorTemplates.ts` | DB-backed quick reply templates with defaults |

### Services
| File | Purpose |
|------|---------|
| `src/services/fhirService.ts` | FHIR R4 bundle export/import (pure TypeScript) |

---

## Modified Files Summary

| File | Changes |
|------|---------|
| `src/App.tsx` | Added routes for Appointments, Prescriptions, DiseasePrograms, PatientMyRecords |
| `src/components/DashboardLayout.tsx` | Added NotificationBell to header |
| `src/components/DoctorSidebar.tsx` | Added Appointments, Prescriptions, Disease Programs nav items |
| `src/components/PatientSidebar.tsx` | Added Appointments, Prescriptions, My Programs, My Records nav items |
| `src/components/DoctorPatientChatWindow.tsx` | Replaced hardcoded templates with DB-backed configurable templates |
| `src/components/ReportsDocumentsHub.tsx` | Persist extracted lab metrics to `lab_metrics` table |
| `src/components/ClinicalDecisionSupportPanel.tsx` | Added AI Risk Profile section |
| `src/pages/ClinicalModules.tsx` | Added Lab History tab |
| `src/pages/DoctorDashboard.tsx` | Replaced mock schedule with real follow-up calendar |
| `src/pages/PatientDetail.tsx` | Added Medication Adherence card, Export FHIR button |
| `src/pages/PatientRegistration.tsx` | Added Import FHIR button |
| `src/pages/PatientDoctorChat.tsx` | Integrated SymptomTriageWizard + triage result banner |
| `src/pages/Prescriptions.tsx` | Added patient dose logging (Log Dose button) |
| `src/integrations/supabase/types.ts` | Added TypeScript types for all 8 new tables |
