# Chapter 3: System Requirements

## 3.1 Introduction

This chapter defines the system requirements for the **Doc+ Medical Assistant** platform. These requirements describe what the platform must do to support doctor-patient collaboration, AI-assisted medical workflows, and secure healthcare data handling. The requirements are divided into functional and non-functional categories to ensure clear implementation, testing, and evaluation.

The chapter is written as measurable requirement statements to support development, verification, and future scaling.

---

## 3.2 Requirement Classification

The requirements for Doc+ are organized into the following groups:

- **Data and persistence requirements**
- **Functional requirements** (authentication, clinical workflows, communication, AI support)
- **Performance requirements**
- **Security requirements**
- **User interface and user experience requirements**

This classification ensures that both technical correctness and user-centered usability are addressed.

---

## 3.3 Specific Project Requirements

This section breaks down the detailed requirements that dictate the platform's functionality and characteristics.

### 3.3.1 Data and Persistence Requirements

The system must manage and persist several types of data securely and efficiently:

- **User Account Data**: Information related to registered users, including unique user IDs, role metadata (doctor/patient), email, and profile linkage between authentication provider and application records.
- **Doctor and Patient Profile Data**: Clinical and demographic profile details such as name, contact details, medical history, allergies, care plan, follow-up date, and related doctor-patient mappings.
- **Chat Session and Message Data**: Persistent records for chat sessions and messages, including sender identity, timestamps, read status, AI-message flags, and optional attachment metadata.
- **Lab and Clinical Metrics Data**: Structured lab observations and extracted report metrics (e.g., glucose, HbA1c, blood pressure) with reference ranges, abnormal flags, and recorded dates.
- **Appointment Data**: Booking details including doctor, patient, appointment date/time, duration, type, status, and notes.
- **Prescription and Medication Log Data**: Medication details, dosage instructions, status lifecycle (active/completed/discontinued), and patient dose logs.
- **Notification Data**: In-app notification events with type, title, body, link target, read/unread state, and creation timestamp.
- **Disease Program Data**: Program enrollment details, monitoring frequency, metric targets, and patient vital logs.
- **Document and File Metadata**: Uploaded records and attachment paths stored in secure object storage with ownership-aware access controls.
- **Environment Variables**: Sensitive configuration such as Supabase URL/keys, Clerk keys, AI provider keys, email service keys, and deployment URLs. These values must not be hard-coded and must be managed securely.

These requirements define the specific data operations and persistence behavior the Doc+ platform must support.

### 3.3.2 User Authentication and Access Control

- The system must allow users to sign in and register through the configured authentication provider flow.
- The system must support role-aware onboarding and metadata assignment (doctor or patient).
- Authenticated users must be redirected to role-appropriate dashboards and modules.
- The system must protect application routes so only authenticated users can access private pages.
- The system must enforce authorization rules so users can access only data they are permitted to view or modify.

### 3.3.3 Doctor Workflow Requirements

#### A) Patient and Clinical Management

- The system must allow doctors to onboard or invite patients.
- The system must provide doctor-accessible patient listing and patient-detail views.
- The system must support entry and update of doctor quick notes, care plans, and follow-up dates.

#### B) Doctor-Patient Communication

- The system must allow doctors to initiate and continue chat sessions with linked patients.
- The system must support message read status and unread visibility.
- The system must support reusable doctor quick-message templates (create, use, and delete).

#### C) Care Operations

- The system must allow doctors to schedule appointments with date/time, type, and notes.
- The system must allow doctors to change appointment states (pending, confirmed, completed, cancelled).
- The system must allow doctors to issue structured prescriptions and update prescription status.

#### D) Clinical Decision Support

- The platform must provide doctor-facing AI assistance for clinical context and reasoning support.
- The system must support generation of SOAP-format summaries from relevant chat context.
- The system must support risk-oriented insights and symptom-triage assistance for clinical workflows.

### 3.3.4 Patient Workflow Requirements

- The system must allow patients to complete onboarding and maintain their profile details.
- Patients must be able to access and participate in doctor chat sessions.
- The system must allow patients to upload and manage personal medical records.
- Patients must be able to view appointments and receive status-related notifications.
- Patients must be able to view prescriptions and log medication adherence events.
- Patients must be able to view enrolled disease programs and submit vital readings.
- The system must present patient care-plan information (instructions and follow-up context) in a clear manner.

### 3.3.5 Real-Time Communication Requirements

- The platform must support real-time style message synchronization for active doctor-patient sessions.
- The system must group communication by session context and prevent message leakage across sessions.
- The system must gracefully handle reconnect behavior and duplicate active connections for the same user/session.

### 3.3.6 AI and Analytics Requirements

- The system must support role-specific AI behavior (doctor-assistant and patient-support modes).
- AI request prompts must include relevant session and profile context when available.
- The system must store generated AI messages in session history where applicable.
- The platform must process and persist extracted lab metrics from uploaded reports.
- The system must provide trend visualization and historical interpretation support for persisted metrics.

### 3.3.7 Feedback and Review Requirements

- The system must maintain a traceable history of chats, prescriptions, appointments, and program logs for review.
- Doctors must be able to review completed care interactions through structured module pages.
- The system must provide visible status indicators (e.g., read states, active/inactive states, pending/completed states) to support quick review.

---

## 3.4 Non-Functional Requirements

### 3.4.1 Performance Requirements

- **Page Load Time**: Primary pages should render within acceptable interactive time on a stable internet connection.
- **Chat Responsiveness**: Real-time chat updates should feel immediate enough for natural doctor-patient communication.
- **AI Interaction Latency**: AI response latency should remain low enough to preserve conversational usability.
- **Database Query Speed**: Core operations (fetching sessions, appointments, patient lists, lab history) must execute efficiently without noticeable UI lag.
- **Scalability**: The architecture (React frontend, Supabase backend, and WebSocket layer) must support increasing concurrent users and sessions without major degradation.

### 3.4.2 Security Requirements

- **Authentication and Authorization**: Access to user-specific dashboards and records must be strictly limited to authorized users.
- **Data Transmission Security**: All client-server communication must be encrypted using HTTPS.
- **API Key Protection**: External service secrets must be stored in environment variables and must not be exposed insecurely.
- **Input Validation and Sanitization**: User input must be validated and sanitized to reduce risks such as malformed data and script injection.
- **Storage Access Control**: Uploaded documents and attachments must be governed by ownership-aware storage policies.

### 3.4.3 Reliability and Maintainability Requirements

- The system must follow migration-based schema evolution to keep database updates traceable.
- The platform must maintain modular code organization to support feature extension and debugging.
- Error cases in critical workflows (auth, chat, uploads, AI requests) must provide recoverable behavior and user feedback.

---

## 3.5 User Interface and User Experience Requirements

### 3.5.1 User Interface Requirements

- The UI must be modern, clean, and professional, using the established component and styling system.
- The interface must maintain consistency in typography, color use, iconography, and component behavior.
- Role-based navigation structures must remain clear and predictable for doctors and patients.

### 3.5.2 Responsiveness Requirements

- The application layout must be responsive for standard desktop usage and adaptable for common screen sizes.
- Core workflows (chat, appointments, patient detail, and records) must remain usable without layout breakage.

### 3.5.3 User Experience Requirements

- Navigation must be intuitive and task-oriented.
- Interactive elements must provide clear visual feedback (hover/focus/disabled states).
- Non-intrusive toast notifications must communicate action outcomes (success, warning, error).
- Workflow transitions must feel smooth and should not interrupt clinical tasks.
- Terminology and labels must remain consistent across all modules.

---

## 3.6 Assumptions and Constraints

The following assumptions and constraints apply to this requirement set:

- Users access the platform over a stable internet connection.
- Deployment environment is configured with valid service keys and endpoints.
- AI output quality depends on prompt context quality and available patient data.
- Regulatory and institutional policies may require additional controls before production-scale rollout.

---

## 3.7 Chapter Summary

This chapter defined the complete system requirements for Doc+, including detailed data requirements, doctor and patient functional workflows, real-time communication and AI requirements, and non-functional requirements for performance, security, reliability, UI, and UX. These requirements establish the baseline for the design and implementation details presented in subsequent chapters.
