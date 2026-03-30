import type { PatientContext, EvidenceItem, ReferralPassport } from '@/types/domain';

export const passportBuilderService = {
  buildPassport(
    patientContext: PatientContext,
    evidence: EvidenceItem[],
    destination: string
  ): ReferralPassport {
    const conditions = patientContext.conditionTags;
    const medications = evidence
      .filter(e => e.resourceType === 'MedicationRequest')
      .map(e => e.label);
    const keyFindings = evidence
      .filter(e => e.resourceType === 'Observation')
      .map(e => `${e.label}: ${e.value}`);

    return {
      id: crypto.randomUUID(),
      title: `Nephrology Referral — ${patientContext.displayName}`,
      patientSummary: `${patientContext.displayName}, ${patientContext.age}${patientContext.sex?.[0] ?? ''}, ${conditions.join(', ')}`,
      destination,
      reasonForReferral: 'Progressive CKD stage 3 with declining eGFR, concurrent T2DM and HTN. Nephrology consultation requested for co-management and proteinuria evaluation.',
      clinicalContext: `${patientContext.age}-year-old ${patientContext.sex?.toLowerCase()} with ${conditions.join(', ')}. eGFR declining trend noted over 18 months. Current renal function requires specialist evaluation.`,
      conditions,
      medications,
      keyFindings,
      attachedEvidenceIds: evidence.filter(e => e.attached).map(e => e.id),
      status: 'draft',
      lastSubmittedAt: null,
    };
  },

  updatePassportWithEvidence(
    passport: ReferralPassport,
    newEvidence: EvidenceItem
  ): ReferralPassport {
    const updated = { ...passport };
    if (!updated.attachedEvidenceIds.includes(newEvidence.id)) {
      updated.attachedEvidenceIds = [...updated.attachedEvidenceIds, newEvidence.id];
    }
    if (newEvidence.resourceType === 'Observation' && newEvidence.resourceKey?.includes('uacr')) {
      updated.keyFindings = [...updated.keyFindings, `${newEvidence.label}: ${newEvidence.value}`];
    }
    return updated;
  },
};
