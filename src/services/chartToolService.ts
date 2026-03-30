import { supabase } from '@/lib/supabase';
import type { EvidenceItem, FhirResourceRow, SponsorTraceItem } from '@/types/domain';

// MCP-inspired chart tool layer
export const chartToolService = {
  async getPatientSnapshot(patientId: string): Promise<{
    evidence: EvidenceItem[];
    trace: SponsorTraceItem[];
  }> {
    const { data: resources, error } = await supabase
      .from('fhir_resources')
      .select('*')
      .eq('patient_id', patientId)
      .neq('resource_key', 'obs-uacr-recent') // Intentionally exclude UACR from initial snapshot
      .order('effective_at', { ascending: false });

    if (error) throw new Error(`Chart snapshot failed: ${error.message}`);

    const evidence = (resources ?? []).map((r: FhirResourceRow) => mapResourceToEvidence(r, true));
    const trace: SponsorTraceItem[] = [
      {
        id: crypto.randomUUID(),
        kind: 'mcp',
        label: 'Chart snapshot requested',
        description: `MCP tool call: getPatientSnapshot(${patientId})`,
        status: 'info',
        timestamp: new Date().toISOString(),
        source: 'chart-tool-service',
      },
      {
        id: crypto.randomUUID(),
        kind: 'fhir',
        label: 'FHIR resources loaded',
        description: `${resources?.length ?? 0} resources retrieved from patient chart`,
        status: 'success',
        timestamp: new Date().toISOString(),
        source: 'fhir-data-service',
      },
    ];

    return { evidence, trace };
  },

  async getLatestUacr(patientId: string): Promise<{
    evidence: EvidenceItem | null;
    trace: SponsorTraceItem[];
  }> {
    const { data: resource, error } = await supabase
      .from('fhir_resources')
      .select('*')
      .eq('patient_id', patientId)
      .eq('resource_key', 'obs-uacr-recent')
      .single();

    const trace: SponsorTraceItem[] = [
      {
        id: crypto.randomUUID(),
        kind: 'mcp',
        label: 'MCP tool call: get_latest_uacr',
        description: `Searching patient chart for UACR observation within 90-day window`,
        status: 'info',
        timestamp: new Date().toISOString(),
        source: 'chart-tool-service',
      },
    ];

    if (error || !resource) {
      trace.push({
        id: crypto.randomUUID(),
        kind: 'mcp',
        label: 'UACR not found in chart',
        description: 'No qualifying UACR observation found in patient record',
        status: 'warning',
        timestamp: new Date().toISOString(),
        source: 'chart-tool-service',
      });
      return { evidence: null, trace };
    }

    const evidence = mapResourceToEvidence(resource as FhirResourceRow, true);
    evidence.newlyAdded = true;

    trace.push({
      id: crypto.randomUUID(),
      kind: 'fhir',
      label: 'FHIR Observation retrieved',
      description: `UACR: ${(resource.resource_json as any)?.valueQuantity?.value} ${(resource.resource_json as any)?.valueQuantity?.unit} (${new Date(resource.effective_at).toLocaleDateString()})`,
      status: 'success',
      timestamp: new Date().toISOString(),
      source: 'fhir-data-service',
    });

    return { evidence, trace };
  },
};

function mapResourceToEvidence(r: FhirResourceRow, attached: boolean): EvidenceItem {
  const json = r.resource_json as Record<string, any>;
  let label = '';
  let value = '';
  let type = r.resource_type;

  switch (r.resource_type) {
    case 'Condition':
      label = json.code?.coding?.[0]?.display ?? 'Condition';
      value = `${json.clinicalStatus ?? 'active'} — onset ${json.onsetDateTime ?? 'unknown'}`;
      break;
    case 'Observation':
      label = json.code?.coding?.[0]?.display ?? 'Observation';
      if (json.valueQuantity) {
        value = `${json.valueQuantity.value} ${json.valueQuantity.unit}`;
      } else if (json.component) {
        value = json.component.map((c: any) =>
          `${c.code?.coding?.[0]?.display ?? ''}: ${c.valueQuantity?.value} ${c.valueQuantity?.unit}`
        ).join(' / ');
      }
      if (json.interpretation) value += ` (${json.interpretation})`;
      break;
    case 'MedicationRequest':
      label = json.medicationCodeableConcept?.text ?? 'Medication';
      value = json.dosageInstruction?.[0]?.text ?? '';
      type = 'Medication';
      break;
    case 'DocumentReference':
      label = json.type?.text ?? 'Document';
      value = json.content ? (json.content as string).substring(0, 120) + '...' : '';
      type = 'Document';
      break;
  }

  return {
    id: r.id,
    type,
    label,
    date: r.effective_at ? new Date(r.effective_at).toLocaleDateString() : '',
    value,
    source: 'Demo EHR (Synthetic)',
    attached,
    newlyAdded: false,
    resourceType: r.resource_type,
    resourceKey: r.resource_key,
  };
}
