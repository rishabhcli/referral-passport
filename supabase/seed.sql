delete from public.audit_logs;
delete from public.artifact_snapshots;
delete from public.run_events;
delete from public.referral_runs;
delete from public.demo_scenarios;
delete from public.requirement_profiles;
delete from public.fhir_resources;
delete from public.destinations;
delete from public.patients;

insert into public.destinations (
  id,
  slug,
  display_name,
  specialty,
  agent_label,
  is_active,
  requirement_profile_version
)
values (
  '00000000-0000-0000-0000-000000000201',
  'nephrology-intake',
  'Nephrology Intake',
  'Nephrology',
  'Nephrology Intake Desk',
  true,
  'v1'
);

insert into public.requirement_profiles (
  id,
  destination_id,
  version,
  profile_json,
  is_active
)
values (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000201',
  'v1',
  '{
    "requirements": [
      {
        "code": "reason_present",
        "label": "Reason for Consult",
        "description": "Referral reason documented",
        "required": true,
        "repairable": false
      },
      {
        "code": "kidney_context_present",
        "label": "Kidney Disease Context",
        "description": "CKD staging and history present",
        "required": true,
        "repairable": false
      },
      {
        "code": "renal_labs_present",
        "label": "Recent Renal Labs",
        "description": "eGFR and creatinine within 90 days",
        "required": true,
        "repairable": false
      },
      {
        "code": "medications_present",
        "label": "Medication List",
        "description": "Current medications documented",
        "required": true,
        "repairable": false
      },
      {
        "code": "uacr_recent",
        "label": "UACR within 90 days",
        "description": "Recent UACR observation available for intake review",
        "required": true,
        "repairable": true
      }
    ]
  }'::jsonb,
  true
);

insert into public.patients (
  id,
  external_patient_key,
  display_name,
  mrn,
  birth_date,
  sex,
  is_synthetic,
  primary_conditions,
  summary
)
values
  (
    '00000000-0000-0000-0000-000000000101',
    'demo-accepted',
    'Eleanor Vance',
    'MRN-100101',
    '1959-04-11',
    'Female',
    true,
    '[
      {"display": "CKD Stage 3"},
      {"display": "Type 2 Diabetes"},
      {"display": "Hypertension"}
    ]'::jsonb,
    '{
      "age": "67",
      "narrative": "Progressive chronic kidney disease with diabetes and hypertension. Referral should be accepted after UACR repair."
    }'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    'demo-blocked',
    'Marcus Hale',
    'MRN-100102',
    '1964-09-02',
    'Male',
    true,
    '[
      {"display": "CKD Stage 4"},
      {"display": "Heart Failure"},
      {"display": "Hypertension"}
    ]'::jsonb,
    '{
      "age": "61",
      "narrative": "Advanced kidney disease without a retrievable UACR. Repair should remain blocked."
    }'::jsonb
  );

insert into public.demo_scenarios (
  id,
  slug,
  display_name,
  patient_id,
  destination_id,
  scenario_json,
  is_default
)
values (
  '00000000-0000-0000-0000-000000000401',
  'repair-to-accepted',
  'Repair To Accepted',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000201',
  '{"description": "Default repair path for the automated tests."}'::jsonb,
  true
);

insert into public.fhir_resources (
  id,
  patient_id,
  resource_type,
  resource_key,
  resource_json,
  effective_at
)
values
  (
    '00000000-0000-0000-0000-000000001001',
    '00000000-0000-0000-0000-000000000101',
    'Condition',
    'cond-ckd3',
    '{
      "code": { "coding": [{ "display": "CKD Stage 3" }] },
      "clinicalStatus": "active",
      "onsetDateTime": "2023-06-01"
    }'::jsonb,
    '2025-11-15T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000001002',
    '00000000-0000-0000-0000-000000000101',
    'Condition',
    'cond-t2dm',
    '{
      "code": { "coding": [{ "display": "Type 2 Diabetes Mellitus" }] },
      "clinicalStatus": "active",
      "onsetDateTime": "2019-03-15"
    }'::jsonb,
    '2025-08-20T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000001003',
    '00000000-0000-0000-0000-000000000101',
    'Condition',
    'cond-htn',
    '{
      "code": { "coding": [{ "display": "Essential Hypertension" }] },
      "clinicalStatus": "active",
      "onsetDateTime": "2017-09-01"
    }'::jsonb,
    '2025-06-10T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000001004',
    '00000000-0000-0000-0000-000000000101',
    'Observation',
    'obs-egfr',
    '{
      "code": { "coding": [{ "display": "eGFR" }] },
      "valueQuantity": { "value": 38, "unit": "mL/min/1.73m²" }
    }'::jsonb,
    '2026-02-28T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000001005',
    '00000000-0000-0000-0000-000000000101',
    'Observation',
    'obs-creatinine',
    '{
      "code": { "coding": [{ "display": "Serum Creatinine" }] },
      "valueQuantity": { "value": 1.6, "unit": "mg/dL" }
    }'::jsonb,
    '2026-02-28T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000001006',
    '00000000-0000-0000-0000-000000000101',
    'MedicationRequest',
    'med-lisinopril',
    '{
      "medicationCodeableConcept": { "text": "Lisinopril 20mg" },
      "dosageInstruction": [{ "text": "Once daily" }]
    }'::jsonb,
    '2025-12-01T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000001007',
    '00000000-0000-0000-0000-000000000101',
    'DocumentReference',
    'doc-referral-note',
    '{
      "type": { "text": "PCP Referral Note" },
      "content": "Patient with progressive CKD, declining eGFR trend, and diabetes-related renal risk."
    }'::jsonb,
    '2026-03-15T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000001008',
    '00000000-0000-0000-0000-000000000101',
    'Observation',
    'obs-uacr-recent',
    '{
      "code": { "coding": [{ "display": "UACR" }] },
      "valueQuantity": { "value": 285, "unit": "mg/g" },
      "interpretation": "elevated"
    }'::jsonb,
    '2026-03-10T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000002001',
    '00000000-0000-0000-0000-000000000102',
    'Condition',
    'cond-ckd4',
    '{
      "code": { "coding": [{ "display": "CKD Stage 4" }] },
      "clinicalStatus": "active",
      "onsetDateTime": "2022-02-17"
    }'::jsonb,
    '2025-11-11T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000002002',
    '00000000-0000-0000-0000-000000000102',
    'Condition',
    'cond-hf',
    '{
      "code": { "coding": [{ "display": "Heart Failure" }] },
      "clinicalStatus": "active",
      "onsetDateTime": "2020-01-09"
    }'::jsonb,
    '2025-07-12T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000002003',
    '00000000-0000-0000-0000-000000000102',
    'Observation',
    'obs-egfr-blocked',
    '{
      "code": { "coding": [{ "display": "eGFR" }] },
      "valueQuantity": { "value": 24, "unit": "mL/min/1.73m²" }
    }'::jsonb,
    '2026-02-18T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000002004',
    '00000000-0000-0000-0000-000000000102',
    'Observation',
    'obs-creatinine-blocked',
    '{
      "code": { "coding": [{ "display": "Serum Creatinine" }] },
      "valueQuantity": { "value": 2.3, "unit": "mg/dL" }
    }'::jsonb,
    '2026-02-18T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000002005',
    '00000000-0000-0000-0000-000000000102',
    'MedicationRequest',
    'med-losartan',
    '{
      "medicationCodeableConcept": { "text": "Losartan 50mg" },
      "dosageInstruction": [{ "text": "Once daily" }]
    }'::jsonb,
    '2025-12-22T00:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000002006',
    '00000000-0000-0000-0000-000000000102',
    'DocumentReference',
    'doc-referral-note-blocked',
    '{
      "type": { "text": "PCP Referral Note" },
      "content": "Referral requests nephrology review for worsening CKD and volume overload symptoms."
    }'::jsonb,
    '2026-03-12T00:00:00Z'
  );
