import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { patientContextService } from '@/services/patientContextService';
import { runOrchestratorService } from '@/services/runOrchestratorService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ArrowRight, Loader2 } from 'lucide-react';

export default function NewReferralPage() {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient') ?? '';
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientContextService.getPatient(patientId),
    enabled: !!patientId,
  });

  const conditions = patient ? (patient.primary_conditions as unknown as Array<{ display: string }>) ?? [] : [];

  const handleBuildAndSubmit = async () => {
    if (!profile || !patient) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await runOrchestratorService.startReferralRun(profile.id, patient.id, 'nephrology-intake');
      navigate(`/app/runs/${result.runId}`);
    } catch (err: any) {
      setError(err.message ?? 'Failed to start referral run');
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Loading patient...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">New Consult Passport</h1>
        <p className="text-sm text-muted-foreground">Build and submit a nephrology referral packet</p>
      </div>

      {patient && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Patient Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium">{patient.display_name}</p>
              <p className="text-sm text-muted-foreground">{(patient.summary as any)?.age ?? '67'}{patient.sex?.[0]} · MRN: {patient.mrn}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {conditions.map((c, i) => (
                <span key={i} className="status-chip bg-secondary text-secondary-foreground">{c.display}</span>
              ))}
            </div>
            <Badge variant="outline" className="text-xs">Synthetic Demo Patient</Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Destination</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Nephrology Intake</p>
            <p className="text-xs text-muted-foreground">Nephrology Intake Desk (A2A)</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">What happens next</p>
          <ol className="list-decimal ml-4 space-y-1 text-xs">
            <li>Patient chart snapshot is retrieved</li>
            <li>Referral passport artifact is assembled</li>
            <li>Packet is submitted to Nephrology Intake for evaluation</li>
            <li>Intake desk returns acceptance decision or required items</li>
          </ol>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button size="lg" className="w-full gap-2" onClick={handleBuildAndSubmit} disabled={submitting || !patient}>
        {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Building & Submitting...</> : <>Build & Submit <ArrowRight className="h-4 w-4" /></>}
      </Button>
    </div>
  );
}
