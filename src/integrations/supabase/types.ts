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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1_id: string | null
          participant_2_id: string | null
          session_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1_id?: string | null
          participant_2_id?: string | null
          session_type: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1_id?: string | null
          participant_2_id?: string | null
          session_type?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          created_at: string
          id: string
          name: string
          registration_no: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          registration_no?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          registration_no?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_mime_type: string | null
          attachment_name: string | null
          attachment_path: string | null
          attachment_size: number | null
          content: string | null
          created_at: string
          id: string
          is_ai_message: boolean | null
          is_read: boolean | null
          message_type: string
          sender_id: string | null
          session_id: string
        }
        Insert: {
          attachment_mime_type?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          content?: string | null
          created_at?: string
          id?: string
          is_ai_message?: boolean | null
          is_read?: boolean | null
          message_type?: string
          sender_id?: string | null
          session_id: string
        }
        Update: {
          attachment_mime_type?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          content?: string | null
          created_at?: string
          id?: string
          is_ai_message?: boolean | null
          is_read?: boolean | null
          message_type?: string
          sender_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_programs: {
        Row: {
          id: string
          patient_user_id: string
          doctor_user_id: string
          program_type: string
          program_name: string
          target_metrics: Json
          check_in_frequency: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_user_id: string
          doctor_user_id: string
          program_type: string
          program_name: string
          target_metrics?: Json
          check_in_frequency?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_user_id?: string
          doctor_user_id?: string
          program_type?: string
          program_name?: string
          target_metrics?: Json
          check_in_frequency?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      vital_logs: {
        Row: {
          id: string
          program_id: string | null
          patient_user_id: string
          metric_type: string
          value: number
          unit: string
          notes: string | null
          logged_at: string
          created_at: string
        }
        Insert: {
          id?: string
          program_id?: string | null
          patient_user_id: string
          metric_type: string
          value: number
          unit: string
          notes?: string | null
          logged_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          program_id?: string | null
          patient_user_id?: string
          metric_type?: string
          value?: number
          unit?: string
          notes?: string | null
          logged_at?: string
          created_at?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          id: string
          doctor_user_id: string
          patient_user_id: string
          patient_id: string | null
          drug_name: string
          dose: string
          frequency: string
          duration: string
          instructions: string | null
          status: string
          issued_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_user_id: string
          patient_user_id: string
          patient_id?: string | null
          drug_name: string
          dose: string
          frequency: string
          duration: string
          instructions?: string | null
          status?: string
          issued_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_user_id?: string
          patient_user_id?: string
          patient_id?: string | null
          drug_name?: string
          dose?: string
          frequency?: string
          duration?: string
          instructions?: string | null
          status?: string
          issued_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          doctor_user_id: string
          patient_user_id: string
          patient_id: string | null
          scheduled_at: string
          duration_minutes: number
          type: string
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_user_id: string
          patient_user_id: string
          patient_id?: string | null
          scheduled_at: string
          duration_minutes?: number
          type?: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_user_id?: string
          patient_user_id?: string
          patient_id?: string | null
          scheduled_at?: string
          duration_minutes?: number
          type?: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctor_availability: {
        Row: {
          id: string
          doctor_user_id: string
          day_of_week: number | null
          specific_date: string | null
          start_time: string
          end_time: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          doctor_user_id: string
          day_of_week?: number | null
          specific_date?: string | null
          start_time: string
          end_time: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          doctor_user_id?: string
          day_of_week?: number | null
          specific_date?: string | null
          start_time?: string
          end_time?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      doctor_templates: {
        Row: {
          id: string
          doctor_user_id: string
          content: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          doctor_user_id: string
          content: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          doctor_user_id?: string
          content?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          link: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body: string
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      lab_metrics: {
        Row: {
          id: string
          patient_id: string
          metric_type: string
          metric_label: string
          value: number
          unit: string
          reference_range: string | null
          abnormal: boolean
          source_document: string | null
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          metric_type: string
          metric_label: string
          value: number
          unit: string
          reference_range?: string | null
          abnormal?: boolean
          source_document?: string | null
          recorded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          metric_type?: string
          metric_label?: string
          value?: number
          unit?: string
          reference_range?: string | null
          abnormal?: boolean
          source_document?: string | null
          recorded_at?: string
          created_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          address: string | null
          age: number | null
          allergies: string | null
          assigned_doctor_id: string | null
          care_plan: string | null
          created_at: string
          current_medications: string | null
          doctor_quick_notes: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          follow_up_date: string | null
          gender: string | null
          id: string
          medical_history: string | null
          name: string
          phone: string | null
          temp_password: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          allergies?: string | null
          assigned_doctor_id?: string | null
          care_plan?: string | null
          created_at?: string
          current_medications?: string | null
          doctor_quick_notes?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          follow_up_date?: string | null
          gender?: string | null
          id?: string
          medical_history?: string | null
          name: string
          phone?: string | null
          temp_password?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          allergies?: string | null
          assigned_doctor_id?: string | null
          care_plan?: string | null
          created_at?: string
          current_medications?: string | null
          doctor_quick_notes?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          follow_up_date?: string | null
          gender?: string | null
          id?: string
          medical_history?: string | null
          name?: string
          phone?: string | null
          temp_password?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_assigned_doctor_id_fkey"
            columns: ["assigned_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["user_id"]
          },
        ]
      }
      medication_logs: {
        Row: {
          id: string
          prescription_id: string
          patient_user_id: string
          taken_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prescription_id: string
          patient_user_id: string
          taken_at?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prescription_id?: string
          patient_user_id?: string
          taken_at?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      symptoms: {
        Row: {
          id: string
          patient_id: string | null
          reported_at: string
          severity: number | null
          symptom: string
        }
        Insert: {
          id?: string
          patient_id?: string | null
          reported_at?: string
          severity?: number | null
          symptom: string
        }
        Update: {
          id?: string
          patient_id?: string | null
          reported_at?: string
          severity?: number | null
          symptom?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptoms_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
