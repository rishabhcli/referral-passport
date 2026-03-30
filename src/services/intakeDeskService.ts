import { supabase } from '@/lib/supabase';
import type { IntakeDecision, RequirementItem, EvidenceItem } from '@/types/domain';

// A2A-inspired downstream intake desk
export const intakeDeskService = {
  async evaluate(
    destinationId: string,
    evidence: EvidenceItem[],
    passport: Record<string, unknown>
  ): Promise<IntakeDecision> {
    // Get active requirement profile
    const { data: profile, error } = await supabase
      .from('requirement_profiles')
      .select('*')
      .eq('destination_id', destinationId)
      .eq('is_active', true)
      .single();

    if (error || !profile) {
      throw new Error('No active requirement profile found for destination');
    }

    const profileJson = profile.profile_json as { requirements: Array<{
      code: string; label: string; description: string; required: boolean; repairable: boolean;
    }> };

    const requirements: RequirementItem[] = profileJson.requirements.map(req => {
      const met = evaluateRequirement(req.code, evidence, passport);
      return {
        code: req.code,
        label: req.label,
        status: met ? 'met' as const : 'unmet' as const,
        description: req.description,
        required: req.required,
        repairable: req.repairable,
      };
    });

    const missingRequirements = requirements.filter(r => r.status === 'unmet' && r.required);
    const satisfiedRequirements = requirements.filter(r => r.status === 'met');

    let decision: IntakeDecision['decision'];
    let summary: string;
    let taskState: string;

    if (missingRequirements.length === 0) {
      decision = 'accepted';
      summary = 'All requirements satisfied. Referral accepted for nephrology intake processing.';
      taskState = 'completed';
    } else if (missingRequirements.some(r => r.repairable)) {
      decision = 'input_required';
      summary = `${missingRequirements.length} required item(s) missing from submission. Additional evidence required.`;
      taskState = 'input-needed';
    } else {
      decision = 'blocked';
      summary = 'Required items missing and cannot be auto-retrieved. Manual follow-up required.';
      taskState = 'blocked';
    }

    return {
      decision,
      taskState,
      missingRequirements,
      satisfiedRequirements,
      summary,
      agentLabel: 'Nephrology Intake Desk (A2A)',
      timestamp: new Date().toISOString(),
    };
  },
};

function evaluateRequirement(
  code: string,
  evidence: EvidenceItem[],
  passport: Record<string, unknown>
): boolean {
  switch (code) {
    case 'reason_present':
      return !!(passport.reasonForReferral);
    case 'kidney_context_present':
      return evidence.some(e => e.resourceKey?.includes('ckd'));
    case 'renal_labs_present':
      return evidence.some(e => e.resourceKey?.includes('creatinine') || e.resourceKey?.includes('egfr'));
    case 'medications_present':
      return evidence.some(e => e.resourceType === 'MedicationRequest');
    case 'uacr_recent':
      return evidence.some(e => e.resourceKey?.includes('uacr') && e.attached);
    default:
      return false;
  }
}
