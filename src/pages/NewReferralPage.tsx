import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { patientContextService } from '@/services/patientContextService';
import { runOrchestratorService } from '@/services/runOrchestratorService';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader2, User, Zap, FileSearch, MessageSquare, CheckCircle2, ChevronDown } from 'lucide-react';

export default function NewReferralPage() {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient') ?? '';
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedDestSlug, setSelectedDestSlug] = useState('');

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientContextService.getPatient(patientId),
    enabled: !!patientId,
  });

  const { data: destinations } = useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Auto-select first destination
  const activeDest = destinations?.find(d => d.slug === selectedDestSlug) ?? destinations?.[0];
  const destSlug = activeDest?.slug ?? '';

  const conditions = patient ? (patient.primary_conditions as unknown as Array<{ display: string }>) ?? [] : [];

  const handleBuildAndSubmit = async () => {
    if (!profile || !patient || !destSlug) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await runOrchestratorService.startReferralRun(profile.id, patient.id, destSlug);
      navigate(`/app/runs/${result.runId}`);
    } catch (err: any) {
      setError(err.message ?? 'Failed to start referral run');
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const steps = [
    { icon: <Zap className="h-3.5 w-3.5" />, label: 'Snapshot chart context', detail: 'FHIR resources pulled from patient record' },
    { icon: <FileSearch className="h-3.5 w-3.5" />, label: 'Assemble referral passport', detail: 'Evidence mapped against requirement profile' },
    { icon: <MessageSquare className="h-3.5 w-3.5" />, label: 'Submit to Intake Desk', detail: `A2A evaluation by ${activeDest?.display_name ?? 'destination'} agent` },
    { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Receive decision', detail: 'Accepted, or list of required items returned' },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">New Consult Passport</h1>
        <p className="text-sm text-muted-foreground">Build and submit a referral packet</p>
      </div>

      {/* Patient Context Card */}
      {patient && (
        <div className="card-elevated p-0 overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
              <span className="mono-label">Patient Context</span>
            </div>
            {patient.is_synthetic && (
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider">Synthetic</Badge>
            )}
          </div>
          <div className="px-5 py-4 space-y-3">
            <div>
              <p className="text-base font-semibold text-foreground">{patient.display_name}</p>
              <p className="text-sm text-muted-foreground">
                {(patient.summary as any)?.age ?? ''}{patient.sex?.[0] ?? ''}{patient.mrn ? ` · MRN: ${patient.mrn}` : ''}
              </p>
            </div>
            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {conditions.map((c, i) => (
                  <span key={i} className="status-chip bg-secondary text-secondary-foreground text-[11px]">{c.display}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Destination Selector */}
      <div className="card-clinical p-0 overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30">
          <span className="mono-label">Destination</span>
        </div>
        <div className="px-5 py-4">
          {destinations && destinations.length > 1 ? (
            <div className="space-y-2">
              {destinations.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDestSlug(d.slug)}
                  data-testid={`destination-option-${d.slug}`}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    (activeDest?.id === d.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{d.display_name}</p>
                    <p className="text-xs text-muted-foreground">{d.specialty ?? 'Intake Desk'} · A2A Protocol</p>
                  </div>
                  {activeDest?.id === d.id && (
                    <span className="status-chip bg-status-info-muted text-status-info text-[10px]">Selected</span>
                  )}
                </button>
              ))}
            </div>
          ) : activeDest ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{activeDest.display_name}</p>
                <p className="text-xs text-muted-foreground">{activeDest.specialty ?? 'Intake Desk'} · A2A Protocol</p>
              </div>
              <span className="status-chip bg-status-info-muted text-status-info text-[10px]">Target</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active destinations available.</p>
          )}
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="card-clinical p-0 overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30">
          <span className="mono-label">Pipeline Steps</span>
        </div>
        <div className="px-5 py-4">
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 relative py-3">
                {i < steps.length - 1 && (
                  <div className="absolute left-[13px] top-[36px] bottom-0 w-px bg-border" />
                )}
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary z-10">
                  {step.icon}
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-status-danger-muted px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* CTA */}
      <Button
        size="lg"
        className="w-full gap-2 brand-gradient-bg border-0 text-white hover:opacity-90 rounded-xl h-12 text-sm font-medium shadow-elevated"
        onClick={handleBuildAndSubmit}
        disabled={submitting || !patient || !destSlug}
        data-testid="build-submit"
      >
        {submitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Building & Submitting...</>
        ) : (
          <>Build & Submit <ArrowRight className="h-4 w-4" /></>
        )}
      </Button>
    </div>
  );
}
