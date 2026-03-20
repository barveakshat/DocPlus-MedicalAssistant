import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle, ArrowRight, Brain, CheckCircle, Loader2, Phone, Stethoscope,
} from 'lucide-react';
import { HuggingFaceService } from '@/services/huggingFaceService';

export interface TriageResult {
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  summary: string;
  chiefComplaint: string;
  duration: string;
  severity: number;
  associatedSymptoms: string[];
}

interface Props {
  onComplete: (result: TriageResult) => void;
  onSkip: () => void;
}

const STEPS = ['Chief Complaint', 'Duration & Severity', 'Associated Symptoms', 'AI Analysis'];

const ASSOCIATED_SYMPTOMS = [
  'Fever', 'Nausea / Vomiting', 'Shortness of breath', 'Chest pain',
  'Dizziness / Fainting', 'Headache', 'Fatigue', 'Abdominal pain',
  'Diarrhoea', 'Swelling', 'Rash', 'Loss of appetite',
];

const urgencyConfig = {
  Emergency: {
    color: 'bg-red-600 text-white',
    border: 'border-red-300 bg-red-50',
    icon: <Phone className="h-5 w-5 text-red-600" />,
    message: 'Your symptoms may require immediate emergency care. Please call emergency services or go to the nearest ER now.',
  },
  Urgent: {
    color: 'bg-amber-500 text-white',
    border: 'border-amber-300 bg-amber-50',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    message: 'Your symptoms need prompt attention. Please proceed to message your doctor immediately.',
  },
  Routine: {
    color: 'bg-emerald-600 text-white',
    border: 'border-emerald-300 bg-emerald-50',
    icon: <CheckCircle className="h-5 w-5 text-emerald-600" />,
    message: 'Your symptoms appear routine. You can proceed to chat with your doctor.',
  },
};

const normalizeUrgency = (value: string): TriageResult['urgency'] | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'emergency') return 'Emergency';
  if (normalized === 'urgent') return 'Urgent';
  if (normalized === 'routine') return 'Routine';
  return null;
};

const parseTriageAiResponse = (responseText: string): { urgency: TriageResult['urgency']; summary: string } | null => {
  const stripped = responseText.replace(/```json|```/gi, '').trim();
  const objectMatches = stripped.match(/\{[\s\S]*?\}/g) ?? [];
  const candidates = [stripped, ...objectMatches];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as
        | { urgency?: string; summary?: string; triage?: { urgency?: string; summary?: string } }
        | null;

      if (!parsed || typeof parsed !== 'object') continue;

      const urgencyValue = parsed.urgency ?? parsed.triage?.urgency;
      const summaryValue = parsed.summary ?? parsed.triage?.summary;

      if (typeof urgencyValue !== 'string' || typeof summaryValue !== 'string') continue;

      const urgency = normalizeUrgency(urgencyValue);
      if (!urgency) continue;

      return {
        urgency,
        summary: summaryValue.trim(),
      };
    } catch {
      continue;
    }
  }

  const inferredUrgency =
    /\bemergency\b/i.test(stripped)
      ? 'Emergency'
      : /\burgent\b/i.test(stripped)
        ? 'Urgent'
        : /\broutine\b/i.test(stripped)
          ? 'Routine'
          : null;

  if (!inferredUrgency) return null;

  return {
    urgency: inferredUrgency,
    summary: stripped,
  };
};

const SymptomTriageWizard: React.FC<Props> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(0);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState(5);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const toggleSymptom = (s: string) =>
    setSelectedSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const runAnalysis = async () => {
    setStep(3);
    setAnalyzing(true);
    setAiError(null);

    const prompt = `You are an emergency triage AI. Classify the urgency of the following patient intake.

Chief complaint: ${chiefComplaint}
Duration: ${duration}
Severity (1-10): ${severity}
Associated symptoms: ${selectedSymptoms.length > 0 ? selectedSymptoms.join(', ') : 'None'}

Respond ONLY with valid JSON in this exact format (no extra text, no markdown):
{
  "urgency": "Routine|Urgent|Emergency",
  "summary": "2-3 sentence clinical summary of the presentation and reasoning for urgency classification"
}

Rules:
- Emergency: chest pain, severe breathlessness, fainting, stroke symptoms, severity >= 9
- Urgent: moderate symptoms severity 6-8, fever with multiple symptoms
- Routine: mild symptoms, chronic complaints, severity <= 5 without red flags`;

    const aiResult = await HuggingFaceService.generateDoctorResponse(prompt, [], 'ai-doctor');

    if (!aiResult.success || !aiResult.response) {
      // Fallback to rule-based triage
      const isEmergency = severity >= 9 || selectedSymptoms.includes('Chest pain') || selectedSymptoms.includes('Shortness of breath');
      const isUrgent = severity >= 6 || selectedSymptoms.includes('Fever');
      const urgency: TriageResult['urgency'] = isEmergency ? 'Emergency' : isUrgent ? 'Urgent' : 'Routine';
      const fallback: TriageResult = {
        urgency,
        summary: `Patient reports ${chiefComplaint} for ${duration} with severity ${severity}/10.${selectedSymptoms.length > 0 ? ` Associated symptoms: ${selectedSymptoms.join(', ')}.` : ''}`,
        chiefComplaint,
        duration,
        severity,
        associatedSymptoms: selectedSymptoms,
      };
      setResult(fallback);
      setAnalyzing(false);
      return;
    }

    const parsed = parseTriageAiResponse(aiResult.response);

    if (parsed) {
      setResult({
        urgency: parsed.urgency,
        summary: parsed.summary,
        chiefComplaint,
        duration,
        severity,
        associatedSymptoms: selectedSymptoms,
      });
    } else {
      setAiError('AI analysis failed — using rule-based triage.');
      const isEmergency = severity >= 9 || selectedSymptoms.includes('Chest pain') || selectedSymptoms.includes('Shortness of breath');
      const urgency: TriageResult['urgency'] = isEmergency ? 'Emergency' : severity >= 6 ? 'Urgent' : 'Routine';
      setResult({
        urgency,
        summary: `Patient reports ${chiefComplaint} for ${duration} with severity ${severity}/10.`,
        chiefComplaint,
        duration,
        severity,
        associatedSymptoms: selectedSymptoms,
      });
    }
    setAnalyzing(false);
  };

  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-[#5442f5]/10 p-2 rounded-xl">
              <Stethoscope className="h-5 w-5 text-[#5442f5]" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Symptom Check-in</h2>
              <p className="text-xs text-slate-500">Quick triage before your doctor chat</p>
            </div>
            <button
              onClick={onSkip}
              className="ml-auto text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Skip
            </button>
          </div>
          <Progress value={progressPct} className="h-1.5" />
          <p className="text-xs text-slate-400 mt-1">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        </div>

        <div className="px-6 py-5 min-h-[220px]">
          {/* Step 0: Chief Complaint */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-700">What is your main concern today?</p>
              <Input
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="e.g. Severe headache, chest tightness, stomach pain..."
                className="text-sm"
                autoFocus
              />
              <p className="text-xs text-slate-400">Describe your primary symptom or reason for contacting your doctor.</p>
            </div>
          )}

          {/* Step 1: Duration & Severity */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">How long have you had this symptom?</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Today', '2-3 days', '1 week', '2 weeks', '1 month', 'Over a month'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`text-xs py-2 px-3 rounded-lg border transition-colors ${
                        duration === d ? 'bg-[#5442f5] text-white border-[#5442f5]' : 'border-slate-200 hover:border-[#5442f5]/50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Severity: <span className="text-[#5442f5]">{severity}/10</span>
                </p>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  className="w-full accent-[#5442f5]"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Mild</span><span>Moderate</span><span>Severe</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Associated Symptoms */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Any other symptoms? (select all that apply)</p>
              <div className="flex flex-wrap gap-2">
                {ASSOCIATED_SYMPTOMS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    className={`text-xs py-1.5 px-3 rounded-full border transition-colors ${
                      selectedSymptoms.includes(s)
                        ? 'bg-[#5442f5] text-white border-[#5442f5]'
                        : 'border-slate-200 hover:border-[#5442f5]/50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">None selected is also fine.</p>
            </div>
          )}

          {/* Step 3: AI Analysis */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center h-full py-4">
              {analyzing ? (
                <div className="text-center space-y-3">
                  <div className="bg-[#5442f5]/10 p-4 rounded-2xl inline-block">
                    <Brain className="h-8 w-8 text-[#5442f5] animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Analysing your symptoms...</p>
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" />
                </div>
              ) : result ? (
                <div className={`w-full rounded-xl border p-4 space-y-3 ${urgencyConfig[result.urgency].border}`}>
                  <div className="flex items-center gap-2">
                    {urgencyConfig[result.urgency].icon}
                    <Badge className={`text-sm font-semibold ${urgencyConfig[result.urgency].color}`}>
                      {result.urgency}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-700">{urgencyConfig[result.urgency].message}</p>
                  <p className="text-xs text-slate-500 border-t border-slate-200 pt-2">{result.summary}</p>
                  {aiError && <p className="text-xs text-amber-600">{aiError}</p>}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end gap-2">
          {step > 0 && step < 3 && (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}

          {step === 0 && (
            <Button
              size="sm"
              disabled={!chiefComplaint.trim()}
              onClick={() => setStep(1)}
              className="bg-[#5442f5] hover:bg-[#4335c0] text-white"
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 1 && (
            <Button
              size="sm"
              disabled={!duration}
              onClick={() => setStep(2)}
              className="bg-[#5442f5] hover:bg-[#4335c0] text-white"
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 2 && (
            <Button
              size="sm"
              onClick={runAnalysis}
              className="bg-[#5442f5] hover:bg-[#4335c0] text-white"
            >
              Analyse <Brain className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 3 && !analyzing && result && (
            <Button
              size="sm"
              onClick={() => onComplete(result)}
              className={
                result.urgency === 'Emergency'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#5442f5] hover:bg-[#4335c0] text-white'
              }
            >
              {result.urgency === 'Emergency' ? 'Proceed to Chat' : 'Continue to Chat'}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SymptomTriageWizard;
