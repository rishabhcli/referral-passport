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

    const conditionList = conditions.length > 0 ? conditions.join(', ') : 'conditions under evaluation';

    return {
      id: crypto.randomUUID(),
      title: `Referral — ${patientContext.displayName}`,
      patientSummary: `${patientContext.displayName}, ${patientContext.age}${patientContext.sex?.[0] ?? ''}, ${conditionList}`,
      destination,
      reasonForReferral: `Consultation requested for ${conditionList}. Specialist evaluation recommended based on current clinical findings.`,
      clinicalContext: `${patientContext.age}-year-old ${patientContext.sex?.toLowerCase()} with ${conditionList}. Current clinical data requires specialist evaluation.`,
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
    if (newEvidence.resourceType === 'Observation') {
      updated.keyFindings = [...updated.keyFindings, `${newEvidence.label}: ${newEvidence.value}`];
    }
    return updated;
  },
};
