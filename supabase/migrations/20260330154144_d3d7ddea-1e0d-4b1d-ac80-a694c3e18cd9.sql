
CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'clinician', 'demo');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text, full_name text,
  role text CHECK (role IN ('admin','coordinator','clinician','demo')) DEFAULT 'demo',
  organization_name text DEFAULT 'Demo Clinic',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role::text) $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), COALESCE(NEW.raw_user_meta_data->>'role', 'demo'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), external_patient_key text UNIQUE,
  display_name text NOT NULL, mrn text, birth_date date, sex text,
  is_synthetic boolean DEFAULT true, primary_conditions jsonb DEFAULT '[]'::jsonb,
  summary jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read patients" ON public.patients FOR SELECT TO authenticated USING (true);

CREATE TABLE public.destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL,
  display_name text NOT NULL, specialty text, agent_label text,
  is_active boolean DEFAULT true, requirement_profile_version text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read destinations" ON public.destinations FOR SELECT TO authenticated USING (true);

CREATE TABLE public.requirement_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid REFERENCES public.destinations(id) ON DELETE CASCADE,
  version text NOT NULL, profile_json jsonb NOT NULL, is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.requirement_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read req profiles" ON public.requirement_profiles FOR SELECT TO authenticated USING (true);

CREATE TABLE public.demo_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL,
  display_name text NOT NULL, patient_id uuid REFERENCES public.patients(id),
  destination_id uuid REFERENCES public.destinations(id),
  scenario_json jsonb NOT NULL, is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.demo_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read scenarios" ON public.demo_scenarios FOR SELECT TO authenticated USING (true);

CREATE TABLE public.referral_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) NOT NULL,
  destination_id uuid REFERENCES public.destinations(id) NOT NULL,
  scenario_id uuid REFERENCES public.demo_scenarios(id),
  state text NOT NULL DEFAULT 'idle' CHECK (state IN ('idle','assembling','submitted','input_required','repairing','resubmitting','accepted','blocked','failed')),
  state_reason text, current_requirement_code text,
  accepted_at timestamptz, blocked_at timestamptz,
  repair_attempted boolean DEFAULT false, entry_surface text DEFAULT 'app',
  context_snapshot jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.referral_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own runs" ON public.referral_runs FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create runs" ON public.referral_runs FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users update own runs" ON public.referral_runs FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_runs_updated_at BEFORE UPDATE ON public.referral_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.run_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.referral_runs(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL, source text, stage text,
  payload jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now()
);
ALTER TABLE public.run_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own run events" ON public.run_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.referral_runs r WHERE r.id = run_id AND (r.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Users insert run events" ON public.run_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.referral_runs r WHERE r.id = run_id AND (r.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE TABLE public.artifact_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.referral_runs(id) ON DELETE CASCADE NOT NULL,
  artifact_name text NOT NULL, artifact_version integer DEFAULT 1,
  content jsonb NOT NULL, created_at timestamptz DEFAULT now()
);
ALTER TABLE public.artifact_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own artifacts" ON public.artifact_snapshots FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.referral_runs r WHERE r.id = run_id AND (r.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Users insert artifacts" ON public.artifact_snapshots FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.referral_runs r WHERE r.id = run_id AND (r.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE TABLE public.fhir_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  resource_type text NOT NULL, resource_key text NOT NULL,
  resource_json jsonb NOT NULL, effective_at timestamptz, created_at timestamptz DEFAULT now()
);
ALTER TABLE public.fhir_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read fhir" ON public.fhir_resources FOR SELECT TO authenticated USING (true);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id),
  action text NOT NULL, entity_type text, entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
