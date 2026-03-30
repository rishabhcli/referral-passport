import type { SponsorTraceItem, TraceKind } from '@/types/domain';

export const traceService = {
  createEntry(
    kind: TraceKind,
    label: string,
    description: string,
    status: SponsorTraceItem['status'] = 'info',
    source = 'system'
  ): SponsorTraceItem {
    return {
      id: crypto.randomUUID(),
      kind,
      label,
      description,
      status,
      timestamp: new Date().toISOString(),
      source,
    };
  },
};
