import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientContextService } from '@/services/patientContextService';
import { chartToolService } from '@/services/chartToolService';
import { runOrchestratorService } from '@/services/runOrchestratorService';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Shield, User, Calendar, Activity } from 'lucide-react';

export default function PatientPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientContextService.getPatient(patientId!),
    enabled: !!patientId,
  });

  const { data: snapshot, isLoading: loadingEvidence } = useQuery({
    queryKey: ['patientEvidence', patientId],
    queryFn: async () => {
      const { evidence } = await chartToolService.getPatientSnapshot(patientId!);
      return evidence;
    },
    enabled: !!patientId,
  });

  const { data: recentRuns } = useQuery({
    queryKey: ['patientRuns', patientId, profile?.id],
    queryFn: async () => {
      const runs = await runOrchestratorService.listRecentRuns(profile!.id);
      return runs.filter(r => r.patientId === patientId);
    },
    enabled: !!patientId && !!profile,
  });

  const conditions = patient
    ? ((patient.primary_conditions as unknown as Array<{ display: string }>) ?? [])
    : [];

  const summary = patient?.summary as Record<string, unknown> | null;
  const birthDate = patient?.birth_date ? new Date(patient.birth_date) : null;
  const age = birthDate
    ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  if (loadingPatient) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center text-sm text-muted-foreground">
        Patient not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Patient Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              {patient.display_name}
            </CardTitle>
            <Badge variant="outline" className="text-xs">Synthetic</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {age !== null && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {age}{patient.sex?.[0]} · DOB {birthDate!.toLocaleDateString()}
              </span>
            )}
            {patient.mrn && <span>MRN: {patient.mrn}</span>}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {conditions.map((c, i) => (
              <span key={i} className="status-chip bg-secondary text-secondary-foreground">{c.display}</span>
            ))}
          </div>

          {summary && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {(summary as any).narrative ?? `${patient.display_name} is a ${age}-year-old patient with ${conditions.map(c => c.display).join(', ')}.`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Destination CTA */}
      <Card className="border-primary/20">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Nephrology Intake</p>
              <p className="text-xs text-muted-foreground">Build & submit a referral passport</p>
            </div>
          </div>
          <Button onClick={() => navigate(`/app/referrals/new?patient=${patient.id}`)} className="gap-1.5">
            Start Consult Passport <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>

      {/* Recent Evidence */}
      <div>
        <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" /> Recent Evidence
        </h2>
        {loadingEvidence ? (
          <Card><CardContent className="py-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        ) : !snapshot || snapshot.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No evidence records found.</CardContent></Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Evidence</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.slice(0, 8).map(ev => (
                  <TableRow key={ev.id}>
                    <TableCell className="text-sm font-medium">{ev.label}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs font-normal">{ev.type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ev.date}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{ev.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Recent Runs for this patient */}
      {recentRuns && recentRuns.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">Recent Runs</h2>
          <div className="space-y-2">
            {recentRuns.map(run => (
              <Card key={run.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate(`/app/runs/${run.id}`)}>
                <CardContent className="py-3 flex items-center justify-between">
                  <p className="text-sm">{run.destination} · {new Date(run.createdAt).toLocaleString()}</p>
                  <Badge variant="outline" className="text-xs">{run.state.replace(/_/g, ' ')}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
