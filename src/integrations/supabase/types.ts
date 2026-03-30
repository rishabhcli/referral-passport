export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      artifact_snapshots: {
        Row: {
          artifact_name: string
          artifact_version: number | null
          content: Json
          created_at: string | null
          id: string
          run_id: string
        }
        Insert: {
          artifact_name: string
          artifact_version?: number | null
          content: Json
          created_at?: string | null
          id?: string
          run_id: string
        }
        Update: {
          artifact_name?: string
          artifact_version?: number | null
          content?: Json
          created_at?: string | null
          id?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifact_snapshots_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "referral_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_scenarios: {
        Row: {
          created_at: string | null
          destination_id: string | null
          display_name: string
          id: string
          is_default: boolean | null
          patient_id: string | null
          scenario_json: Json
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          destination_id?: string | null
          display_name: string
          id?: string
          is_default?: boolean | null
          patient_id?: string | null
          scenario_json: Json
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          destination_id?: string | null
          display_name?: string
          id?: string
          is_default?: boolean | null
          patient_id?: string | null
          scenario_json?: Json
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_scenarios_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_scenarios_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          agent_label: string | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          requirement_profile_version: string | null
          slug: string
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          agent_label?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          requirement_profile_version?: string | null
          slug: string
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_label?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          requirement_profile_version?: string | null
          slug?: string
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fhir_resources: {
        Row: {
          created_at: string | null
          effective_at: string | null
          id: string
          patient_id: string
          resource_json: Json
          resource_key: string
          resource_type: string
        }
        Insert: {
          created_at?: string | null
          effective_at?: string | null
          id?: string
          patient_id: string
          resource_json: Json
          resource_key: string
          resource_type: string
        }
        Update: {
          created_at?: string | null
          effective_at?: string | null
          id?: string
          patient_id?: string
          resource_json?: Json
          resource_key?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fhir_resources_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          birth_date: string | null
          created_at: string | null
          display_name: string
          external_patient_key: string | null
          id: string
          is_synthetic: boolean | null
          mrn: string | null
          primary_conditions: Json | null
          sex: string | null
          summary: Json | null
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          display_name: string
          external_patient_key?: string | null
          id?: string
          is_synthetic?: boolean | null
          mrn?: string | null
          primary_conditions?: Json | null
          sex?: string | null
          summary?: Json | null
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          display_name?: string
          external_patient_key?: string | null
          id?: string
          is_synthetic?: boolean | null
          mrn?: string | null
          primary_conditions?: Json | null
          sex?: string | null
          summary?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          organization_name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          organization_name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          organization_name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_runs: {
        Row: {
          accepted_at: string | null
          blocked_at: string | null
          context_snapshot: Json | null
          created_at: string | null
          created_by: string | null
          current_requirement_code: string | null
          destination_id: string
          entry_surface: string | null
          id: string
          patient_id: string
          repair_attempted: boolean | null
          scenario_id: string | null
          state: string
          state_reason: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          blocked_at?: string | null
          context_snapshot?: Json | null
          created_at?: string | null
          created_by?: string | null
          current_requirement_code?: string | null
          destination_id: string
          entry_surface?: string | null
          id?: string
          patient_id: string
          repair_attempted?: boolean | null
          scenario_id?: string | null
          state?: string
          state_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          blocked_at?: string | null
          context_snapshot?: Json | null
          created_at?: string | null
          created_by?: string | null
          current_requirement_code?: string | null
          destination_id?: string
          entry_surface?: string | null
          id?: string
          patient_id?: string
          repair_attempted?: boolean | null
          scenario_id?: string | null
          state?: string
          state_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_runs_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_runs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_runs_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "demo_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_profiles: {
        Row: {
          created_at: string | null
          destination_id: string | null
          id: string
          is_active: boolean | null
          profile_json: Json
          updated_at: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          destination_id?: string | null
          id?: string
          is_active?: boolean | null
          profile_json: Json
          updated_at?: string | null
          version: string
        }
        Update: {
          created_at?: string | null
          destination_id?: string | null
          id?: string
          is_active?: boolean | null
          profile_json?: Json
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_profiles_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      run_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
          run_id: string
          source: string | null
          stage: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          run_id: string
          source?: string | null
          stage?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          run_id?: string
          source?: string | null
          stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "referral_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coordinator" | "clinician" | "demo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coordinator", "clinician", "demo"],
    },
  },
} as const
