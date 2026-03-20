/**
 * FHIR R4 EHR Export & Import
 * Pure client-side — no external FHIR library required.
 * Spec: https://hl7.org/fhir/R4/
 */

// ─── Minimal FHIR R4 Types ───────────────────────────────────────────────────

interface FhirCoding { system?: string; code?: string; display?: string; }
interface FhirCodeableConcept { coding?: FhirCoding[]; text?: string; }
interface FhirReference { reference?: string; display?: string; }
interface FhirQuantity { value?: number; unit?: string; system?: string; code?: string; }
interface FhirRange { low?: FhirQuantity; high?: FhirQuantity; }

interface FhirPatientResource {
  resourceType: 'Patient';
  id: string;
  name: Array<{ use?: string; text: string }>;
  gender?: string;
  birthDate?: string;
  telecom?: Array<{ system: string; value: string }>;
  address?: Array<{ text: string }>;
  contact?: Array<{
    name?: { text: string };
    telecom?: Array<{ system: string; value: string }>;
  }>;
  extension?: Array<{ url: string; valueString?: string }>;
}

interface FhirObservationResource {
  resourceType: 'Observation';
  id: string;
  status: 'final';
  code: FhirCodeableConcept;
  subject?: FhirReference;
  effectiveDateTime?: string;
  valueQuantity?: FhirQuantity;
  interpretation?: FhirCodeableConcept[];
  referenceRange?: Array<{ text?: string; low?: FhirQuantity; high?: FhirQuantity }>;
}

interface FhirMedicationRequestResource {
  resourceType: 'MedicationRequest';
  id: string;
  status: string;
  intent: 'order';
  medicationCodeableConcept: FhirCodeableConcept;
  subject: FhirReference;
  authoredOn?: string;
  dosageInstruction?: Array<{
    text?: string;
    timing?: { code?: FhirCodeableConcept };
  }>;
  dispenseRequest?: { validityPeriod?: { start?: string } };
  note?: Array<{ text: string }>;
}

interface FhirConditionResource {
  resourceType: 'Condition';
  id: string;
  subject: FhirReference;
  code: FhirCodeableConcept;
  recordedDate?: string;
  note?: Array<{ text: string }>;
}

type FhirResource =
  | FhirPatientResource
  | FhirObservationResource
  | FhirMedicationRequestResource
  | FhirConditionResource;

export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'collection';
  timestamp: string;
  entry: Array<{ resource: FhirResource }>;
}

// ─── Input types (from Supabase) ─────────────────────────────────────────────

export interface FhirPatientInput {
  id: string;
  name: string;
  age?: number | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  medical_history?: string | null;
  allergies?: string | null;
  current_medications?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

export interface FhirLabMetricInput {
  id: string;
  metric_type: string;
  metric_label: string;
  value: number;
  unit: string;
  reference_range?: string | null;
  abnormal?: boolean;
  recorded_at: string;
}

export interface FhirPrescriptionInput {
  id: string;
  drug_name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
  status: string;
  issued_at: string;
}

// ─── LOINC code map for common metrics ───────────────────────────────────────

const LOINC_MAP: Record<string, { code: string; display: string }> = {
  glucose:     { code: '2339-0', display: 'Glucose [Mass/volume] in Blood' },
  hba1c:       { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
  systolic:    { code: '8480-6', display: 'Systolic blood pressure' },
  diastolic:   { code: '8462-4', display: 'Diastolic blood pressure' },
  hemoglobin:  { code: '718-7', display: 'Hemoglobin [Mass/volume] in Blood' },
  weight:      { code: '29463-7', display: 'Body weight' },
  heart_rate:  { code: '8867-4', display: 'Heart rate' },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export function patientToFHIR(
  patient: FhirPatientInput,
  labMetrics: FhirLabMetricInput[] = [],
  prescriptions: FhirPrescriptionInput[] = []
): FhirBundle {
  const patientRef = `Patient/${patient.id}`;

  const patientResource: FhirPatientResource = {
    resourceType: 'Patient',
    id: patient.id,
    name: [{ use: 'official', text: patient.name }],
    ...(patient.gender ? { gender: patient.gender.toLowerCase() } : {}),
    ...(patient.email || patient.phone ? {
      telecom: [
        ...(patient.email ? [{ system: 'email', value: patient.email }] : []),
        ...(patient.phone ? [{ system: 'phone', value: patient.phone }] : []),
      ],
    } : {}),
    ...(patient.address ? { address: [{ text: patient.address }] } : {}),
    ...(patient.emergency_contact_name ? {
      contact: [{
        name: { text: patient.emergency_contact_name },
        ...(patient.emergency_contact_phone ? {
          telecom: [{ system: 'phone', value: patient.emergency_contact_phone }],
        } : {}),
      }],
    } : {}),
  };

  const observations: FhirObservationResource[] = labMetrics.map((m) => {
    const loinc = LOINC_MAP[m.metric_type];
    let refRange: Array<{ text?: string; low?: FhirQuantity; high?: FhirQuantity }> | undefined;
    if (m.reference_range) {
      const match = m.reference_range.match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
      if (match) {
        refRange = [{
          low: { value: parseFloat(match[1]), unit: m.unit },
          high: { value: parseFloat(match[2]), unit: m.unit },
        }];
      } else {
        refRange = [{ text: m.reference_range }];
      }
    }
    return {
      resourceType: 'Observation',
      id: m.id,
      status: 'final',
      code: {
        coding: loinc ? [{ system: 'http://loinc.org', code: loinc.code, display: loinc.display }] : [],
        text: m.metric_label,
      },
      subject: { reference: patientRef, display: patient.name },
      effectiveDateTime: m.recorded_at,
      valueQuantity: { value: m.value, unit: m.unit },
      ...(m.abnormal ? {
        interpretation: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', code: 'A', display: 'Abnormal' }],
        }],
      } : {}),
      ...(refRange ? { referenceRange: refRange } : {}),
    };
  });

  const medicationRequests: FhirMedicationRequestResource[] = prescriptions.map((rx) => ({
    resourceType: 'MedicationRequest',
    id: rx.id,
    status: rx.status === 'active' ? 'active' : rx.status === 'discontinued' ? 'stopped' : 'completed',
    intent: 'order',
    medicationCodeableConcept: { text: rx.drug_name },
    subject: { reference: patientRef, display: patient.name },
    authoredOn: rx.issued_at,
    dosageInstruction: [{
      text: `${rx.dose} — ${rx.frequency} for ${rx.duration}`,
      ...(rx.instructions ? {} : {}),
    }],
    ...(rx.instructions ? { note: [{ text: rx.instructions }] } : {}),
  }));

  const conditions: FhirConditionResource[] = [];
  if (patient.medical_history?.trim()) {
    conditions.push({
      resourceType: 'Condition',
      id: `cond-history-${patient.id}`,
      subject: { reference: patientRef },
      code: { text: 'Medical History' },
      note: [{ text: patient.medical_history }],
    });
  }
  if (patient.allergies?.trim()) {
    conditions.push({
      resourceType: 'Condition',
      id: `cond-allergies-${patient.id}`,
      subject: { reference: patientRef },
      code: { text: 'Allergies' },
      note: [{ text: patient.allergies }],
    });
  }

  const bundle: FhirBundle = {
    resourceType: 'Bundle',
    id: `bundle-${patient.id}-${Date.now()}`,
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: [
      { resource: patientResource },
      ...observations.map((r) => ({ resource: r as FhirResource })),
      ...medicationRequests.map((r) => ({ resource: r as FhirResource })),
      ...conditions.map((r) => ({ resource: r as FhirResource })),
    ],
  };

  return bundle;
}

export function downloadFHIRBundle(bundle: FhirBundle, patientName: string): void {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/fhir+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${patientName.replace(/\s+/g, '_')}_FHIR_R4.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ParsedFHIRPatient {
  name: string;
  gender?: string;
  email?: string;
  phone?: string;
  address?: string;
  medical_history?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export function fhirToPatient(bundle: FhirBundle): ParsedFHIRPatient | null {
  const patientEntry = bundle.entry?.find((e) => e.resource?.resourceType === 'Patient');
  if (!patientEntry) return null;

  const p = patientEntry.resource as FhirPatientResource;
  const name = p.name?.[0]?.text ?? '';
  const email = p.telecom?.find((t) => t.system === 'email')?.value;
  const phone = p.telecom?.find((t) => t.system === 'phone')?.value;
  const address = p.address?.[0]?.text;
  const emergency_contact_name = p.contact?.[0]?.name?.text;
  const emergency_contact_phone = p.contact?.[0]?.telecom?.find((t) => t.system === 'phone')?.value;

  const conditionEntries = bundle.entry
    ?.filter((e) => e.resource?.resourceType === 'Condition')
    .map((e) => e.resource as FhirConditionResource) ?? [];

  const historyEntry = conditionEntries.find((c) => c.code?.text === 'Medical History');
  const allergiesEntry = conditionEntries.find((c) => c.code?.text === 'Allergies');

  return {
    name,
    gender: p.gender,
    email,
    phone,
    address,
    medical_history: historyEntry?.note?.[0]?.text,
    allergies: allergiesEntry?.note?.[0]?.text,
    emergency_contact_name,
    emergency_contact_phone,
  };
}
