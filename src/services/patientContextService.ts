import { supabase } from '@/lib/supabase';
import type { PatientContext } from '@/types/domain';

export const patientContextService = {
  async getPatient(patientId: string) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();
    if (error) throw new Error(`Patient not found: ${error.message}`);
    return data;
  },

  async getDefaultPatient() {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('is_synthetic', true)
      .limit(1)
      .single();
    if (error) throw new Error(`No default patient: ${error.message}`);
    return data;
  },

  buildPatientContext(patient: { id: string; display_name: string; birth_date: string; sex: string | null; primary_conditions: unknown; summary: unknown; external_patient_key: string | null }): PatientContext {
    const conditions = (patient.primary_conditions as Array<{ display: string }>) ?? [];
    const summary = patient.summary as Record<string, unknown>;
    const birthDate = new Date(patient.birth_date);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    return {
      patientId: patient.id,
      displayName: patient.display_name,
      age,
      sex: patient.sex ?? 'Unknown',
      conditionTags: conditions.map(c => c.display),
      fhirContext: {
        fhirUrl: `https://fhir.demo.clinic/Patient/${patient.external_patient_key}`,
        patientId: patient.external_patient_key ?? patient.id,
        tokenPresent: true,
        sourceLabel: 'Demo EHR (Synthetic)',
      },
    };
  },

  async listPatients() {
    const { data, error } = await supabase.from('patients').select('*');
    if (error) throw error;
    return data ?? [];
  },
};
