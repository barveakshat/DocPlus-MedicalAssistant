import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Brain, Loader2, ShieldAlert, Syringe, Stethoscope, TriangleAlert } from 'lucide-react';
import type { ReportsInsights } from '@/components/ReportsDocumentsHub';
import { HuggingFaceService } from '@/services/huggingFaceService';

interface ClinicalDecisionSupportPanelProps {
  patientName: string;
  insights: ReportsInsights;
}

interface InteractionRule {
  a: string;
  b: string;
  severity: 'high' | 'medium';
  reason: string;
}

const interactionRules: InteractionRule[] = [
  {
    a: 'warfarin',
    b: 'aspirin',
    severity: 'high',
    reason: 'Increased bleeding risk',
  },
  {
    a: 'warfarin',
    b: 'ibuprofen',
    severity: 'high',
    reason: 'Higher risk of GI bleeding',
  },
  {
    a: 'sildenafil',
    b: 'nitroglycerin',
    severity: 'high',
    reason: 'Can cause dangerous hypotension',
  },
  {
    a: 'metformin',
    b: 'contrast',
    severity: 'medium',
    reason: 'Review renal function around contrast studies',
  },
  {
    a: 'insulin',
    b: 'propranolol',
    severity: 'medium',
    reason: 'Beta blockers can mask hypoglycemia symptoms',
  },
];

const dangerSymptomRules = [
  { term: 'chest pain', score: 35, reason: 'Chest pain reported' },
  { term: 'shortness of breath', score: 30, reason: 'Shortness of breath reported' },
  { term: 'breathlessness', score: 30, reason: 'Breathlessness reported' },
  { term: 'fainting', score: 30, reason: 'Syncope/fainting reported' },
  { term: 'confusion', score: 25, reason: 'Altered mental status symptom reported' },
  { term: 'bleeding', score: 30, reason: 'Active bleeding symptom reported' },
  { term: 'high fever', score: 15, reason: 'High fever reported' },
];

const getLatestMetricValue = (insights: ReportsInsights, type: string) => {
  const metric = insights.metrics.find((item) => item.type === type);
  return metric?.value;
};

interface RiskLevel { level: 'Low' | 'Medium' | 'High'; explanation: string; }
interface AiRiskProfile {
  cardiovascular: RiskLevel;
  diabetic: RiskLevel;
  medication: RiskLevel;
  summary: string;
}

const ClinicalDecisionSupportPanel: React.FC<ClinicalDecisionSupportPanelProps> = ({
  patientName,
  insights,
}) => {
  const [symptoms, setSymptoms] = useState('');
  const [medicationsInput, setMedicationsInput] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [aiRiskProfile, setAiRiskProfile] = useState<AiRiskProfile | null>(null);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);

  const handleGenerateRiskProfile = async () => {
    setIsLoadingRisk(true);
    setRiskError(null);
    setAiRiskProfile(null);

    const metricsSummary = insights.metrics.length > 0
      ? insights.metrics.slice(0, 5).map((m) => `${m.type}: ${m.value} ${m.unit ?? ''}`).join(', ')
      : 'No metrics available';

    const prompt = `You are a clinical risk assessment AI. Analyze the following patient data and return a JSON risk profile.

Patient: ${patientName}
Symptoms: ${symptoms || 'None reported'}
Medications: ${medicationsInput || 'None listed'}
Symptom duration: ${durationDays ? `${durationDays} days` : 'Not specified'}
Lab metrics: ${metricsSummary}
Abnormal alerts: ${insights.alerts.length > 0 ? insights.alerts.map((a) => a.description).join('; ') : 'None'}

Respond ONLY with a valid JSON object in this exact format (no extra text, no markdown):
{
  "cardiovascular": { "level": "Low|Medium|High", "explanation": "brief reason" },
  "diabetic": { "level": "Low|Medium|High", "explanation": "brief reason" },
  "medication": { "level": "Low|Medium|High", "explanation": "brief reason" },
  "summary": "one sentence overall clinical impression"
}`;

    const result = await HuggingFaceService.generateDoctorResponse(prompt, [], 'ai-doctor');
    if (!result.success || !result.response) {
      setRiskError(result.error ?? 'Failed to generate risk profile.');
      setIsLoadingRisk(false);
      return;
    }

    try {
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const parsed = JSON.parse(jsonMatch[0]) as AiRiskProfile;
      setAiRiskProfile(parsed);
    } catch {
      setRiskError('Could not parse AI response. Try again.');
    }
    setIsLoadingRisk(false);
  };

  const normalizedSymptoms = symptoms.toLowerCase();
  const medications = useMemo(
    () => medicationsInput
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
    [medicationsInput]
  );

  const triageComputation = useMemo(() => {
    const matchedRules = dangerSymptomRules.filter((rule) => normalizedSymptoms.includes(rule.term));
    let score = matchedRules.reduce((acc, rule) => acc + rule.score, 0);

    const glucose = getLatestMetricValue(insights, 'glucose');
    const systolic = getLatestMetricValue(insights, 'systolic');
    const diastolic = getLatestMetricValue(insights, 'diastolic');

    if (typeof glucose === 'number' && (glucose >= 250 || glucose < 60)) score += 30;
    else if (typeof glucose === 'number' && (glucose > 180 || glucose < 70)) score += 15;

    if (typeof systolic === 'number' && systolic >= 180) score += 30;
    else if (typeof systolic === 'number' && systolic >= 160) score += 20;

    if (typeof diastolic === 'number' && diastolic >= 120) score += 30;
    else if (typeof diastolic === 'number' && diastolic >= 100) score += 15;

    if (insights.alerts.some((alert) => alert.severity === 'high')) score += 20;
    else if (insights.alerts.length > 0) score += 10;

    const duration = Number(durationDays);
    if (!Number.isNaN(duration) && duration >= 7) score += 5;

    const finalScore = Math.min(100, score);
    const level = finalScore >= 70 ? 'high' : finalScore >= 40 ? 'moderate' : 'low';

    return {
      score: finalScore,
      level,
      reasons: matchedRules.map((item) => item.reason),
    };
  }, [durationDays, insights, normalizedSymptoms]);

  const redFlags = useMemo(() => {
    const flags: string[] = [];

    if (normalizedSymptoms.includes('chest pain')) flags.push('Possible cardiac symptom: chest pain');
    if (normalizedSymptoms.includes('shortness of breath') || normalizedSymptoms.includes('breathlessness')) {
      flags.push('Respiratory distress symptom reported');
    }
    if (normalizedSymptoms.includes('confusion')) flags.push('Neurological red flag: confusion');

    const glucose = getLatestMetricValue(insights, 'glucose');
    if (typeof glucose === 'number' && glucose >= 250) flags.push(`Severe hyperglycemia risk (${glucose} mg/dL)`);
    if (typeof glucose === 'number' && glucose < 60) flags.push(`Severe hypoglycemia risk (${glucose} mg/dL)`);

    const systolic = getLatestMetricValue(insights, 'systolic');
    const diastolic = getLatestMetricValue(insights, 'diastolic');
    if (typeof systolic === 'number' && systolic >= 180) flags.push(`Hypertensive crisis range systolic BP (${systolic})`);
    if (typeof diastolic === 'number' && diastolic >= 120) flags.push(`Hypertensive crisis range diastolic BP (${diastolic})`);

    if (insights.alerts.some((alert) => alert.severity === 'high')) {
      flags.push('High-severity abnormal report alert present');
    }

    return flags;
  }, [insights, normalizedSymptoms]);

  const interactionFindings = useMemo(() => {
    const findings: Array<{ severity: 'high' | 'medium'; text: string }> = [];

    for (const rule of interactionRules) {
      const hasA = medications.some((med) => med.includes(rule.a));
      const hasB = medications.some((med) => med.includes(rule.b));
      if (hasA && hasB) {
        findings.push({
          severity: rule.severity,
          text: `${rule.a} + ${rule.b}: ${rule.reason}`,
        });
      }
    }

    return findings;
  }, [medications]);

  const guidelineSuggestions = useMemo(() => {
    const suggestions: string[] = [];

    const glucose = getLatestMetricValue(insights, 'glucose');
    const systolic = getLatestMetricValue(insights, 'systolic');
    const diastolic = getLatestMetricValue(insights, 'diastolic');
    const hba1c = getLatestMetricValue(insights, 'hba1c');

    if (typeof glucose === 'number' && glucose > 180) {
      suggestions.push('Repeat capillary glucose and evaluate ketone status if symptomatic.');
    }
    if (typeof hba1c === 'number' && hba1c >= 6.5) {
      suggestions.push('Review diabetes control plan and schedule follow-up for glycemic optimization.');
    }
    if (
      (typeof systolic === 'number' && systolic >= 140) ||
      (typeof diastolic === 'number' && diastolic >= 90)
    ) {
      suggestions.push('Confirm elevated BP with repeat readings and assess cardiovascular risk profile.');
    }
    if (normalizedSymptoms.includes('cough') || normalizedSymptoms.includes('fever')) {
      suggestions.push('If respiratory symptoms persist, consider focused chest exam and infection workup.');
    }
    if (redFlags.length > 0) {
      suggestions.push('Prioritize urgent review due to red-flag findings and escalate if clinically unstable.');
    }

    if (suggestions.length === 0) {
      suggestions.push('No major guideline triggers detected yet. Continue monitoring and document symptom progression.');
    }

    return suggestions;
  }, [insights, normalizedSymptoms, redFlags.length]);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Clinical Decision Support</CardTitle>
          <Badge variant={triageComputation.level === 'high' ? 'destructive' : 'secondary'}>
            {triageComputation.level.toUpperCase()} TRIAGE
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">MVP safety checks and guidance for {patientName}</p>
      </CardHeader>

      <CardContent className="space-y-4 h-[calc(100%-6.25rem)] overflow-auto">
        <div className="space-y-2 rounded-md border p-3">
          <div className="text-sm font-medium">Inputs for triage and safety checks</div>
          <Textarea
            value={symptoms}
            onChange={(event) => setSymptoms(event.target.value)}
            placeholder="Symptoms (example: chest pain, breathlessness, high fever, fatigue)..."
            className="min-h-[80px]"
          />
          <Input
            value={medicationsInput}
            onChange={(event) => setMedicationsInput(event.target.value)}
            placeholder="Medications comma-separated (example: warfarin, aspirin, metformin)"
          />
          <Input
            value={durationDays}
            onChange={(event) => setDurationDays(event.target.value)}
            type="number"
            min={0}
            placeholder="Symptom duration in days"
          />
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2"><Stethoscope className="h-4 w-4" /> Symptom triage score</span>
            <span>{triageComputation.score}/100</span>
          </div>
          <Progress value={triageComputation.score} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Based on entered symptoms + uploaded report abnormalities.
          </p>
          {triageComputation.reasons.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Signals: {triageComputation.reasons.join(', ')}
            </div>
          )}
        </div>

        <Alert variant={redFlags.length > 0 ? 'destructive' : 'default'}>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Red-flag detection</AlertTitle>
          <AlertDescription>
            {redFlags.length === 0 ? (
              <span>No critical red flags detected from current data.</span>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                {redFlags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>

        <Separator />

        <div className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium flex items-center gap-2">
            <Syringe className="h-4 w-4" /> Drug interaction checks
          </div>
          {interactionFindings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No known interaction from entered medication list.</p>
          ) : (
            <div className="space-y-2">
              {interactionFindings.map((finding) => (
                <Alert key={finding.text} variant={finding.severity === 'high' ? 'destructive' : 'default'}>
                  <TriangleAlert className="h-4 w-4" />
                  <AlertDescription>{finding.text}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium">Guideline-based suggestions</div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {guidelineSuggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            This module provides decision support only. Final decisions remain with the treating clinician.
          </p>
        </div>

        <Separator />

        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" /> AI Risk Profile
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleGenerateRiskProfile()}
              disabled={isLoadingRisk}
              className="h-7 text-xs"
            >
              {isLoadingRisk ? (
                <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Analyzing...</>
              ) : (
                'Generate'
              )}
            </Button>
          </div>

          {riskError && (
            <p className="text-xs text-destructive">{riskError}</p>
          )}

          {aiRiskProfile && (() => {
            const colorClass = (level: string) =>
              level === 'High' ? 'text-red-600 bg-red-50 border-red-200'
              : level === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-200'
              : 'text-green-600 bg-green-50 border-green-200';

            return (
              <div className="space-y-2">
                {(
                  [
                    { label: 'Cardiovascular', key: 'cardiovascular' },
                    { label: 'Diabetic', key: 'diabetic' },
                    { label: 'Medication', key: 'medication' },
                  ] as const
                ).map(({ label, key }) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className={`text-[11px] font-semibold border px-1.5 py-0.5 rounded shrink-0 ${colorClass(aiRiskProfile[key].level)}`}>
                      {aiRiskProfile[key].level}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{label}: </span>
                      {aiRiskProfile[key].explanation}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground italic border-t pt-2 mt-1">{aiRiskProfile.summary}</p>
              </div>
            );
          })()}

          {!aiRiskProfile && !isLoadingRisk && !riskError && (
            <p className="text-xs text-muted-foreground">
              Click Generate to run an AI-powered risk assessment using the entered symptoms, medications, and uploaded lab metrics.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClinicalDecisionSupportPanel;
