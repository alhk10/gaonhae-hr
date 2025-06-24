export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_access: {
        Row: {
          attendance: boolean | null
          claims: boolean | null
          created_at: string | null
          employee_id: string | null
          employees: boolean | null
          id: number
          leave_management: boolean | null
          payroll: boolean | null
          reports: boolean | null
          slot_booking: boolean | null
        }
        Insert: {
          attendance?: boolean | null
          claims?: boolean | null
          created_at?: string | null
          employee_id?: string | null
          employees?: boolean | null
          id?: number
          leave_management?: boolean | null
          payroll?: boolean | null
          reports?: boolean | null
          slot_booking?: boolean | null
        }
        Update: {
          attendance?: boolean | null
          claims?: boolean | null
          created_at?: string | null
          employee_id?: string | null
          employees?: boolean | null
          id?: number
          leave_management?: boolean | null
          payroll?: boolean | null
          reports?: boolean | null
          slot_booking?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_access_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      allowances: {
        Row: {
          amount: number
          created_at: string | null
          employee_id: string | null
          id: number
          name: string
          type: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          employee_id?: string | null
          id?: number
          name: string
          type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          employee_id?: string | null
          id?: number
          name?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allowances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          break_end: string | null
          break_start: string | null
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string | null
          hours_worked: number | null
          id: number
          status: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          employee_id?: string | null
          hours_worked?: number | null
          id?: number
          status: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string | null
          hours_worked?: number | null
          id?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          employee_id: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          name: string
          upload_date: string | null
        }
        Insert: {
          employee_id?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          name: string
          upload_date?: string | null
        }
        Update: {
          employee_id?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          name?: string
          upload_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          employee_id: string | null
          id: number
          receipt_url: string | null
          reviewed_by: string | null
          reviewed_date: string | null
          status: string
          submitted_date: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          employee_id?: string | null
          id?: number
          receipt_url?: string | null
          reviewed_by?: string | null
          reviewed_date?: string | null
          status?: string
          submitted_date?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          employee_id?: string | null
          id?: number
          receipt_url?: string | null
          reviewed_by?: string | null
          reviewed_date?: string | null
          status?: string
          submitted_date?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      deductions: {
        Row: {
          amount: number
          created_at: string | null
          employee_id: string | null
          id: number
          name: string
          type: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          employee_id?: string | null
          id?: number
          name: string
          type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          employee_id?: string | null
          id?: number
          name?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          bank_account: string
          bank_name: string
          base_salary: number | null
          created_at: string | null
          daily_rate: number | null
          date_of_birth: string
          department: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          name: string
          nric: string
          payment_type: string | null
          phone: string | null
          position: string | null
          residency_status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bank_account: string
          bank_name: string
          base_salary?: number | null
          created_at?: string | null
          daily_rate?: number | null
          date_of_birth: string
          department?: string | null
          email?: string | null
          hourly_rate?: number | null
          id: string
          name: string
          nric: string
          payment_type?: string | null
          phone?: string | null
          position?: string | null
          residency_status: string
          type: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string
          bank_name?: string
          base_salary?: number | null
          created_at?: string | null
          daily_rate?: number | null
          date_of_birth?: string
          department?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          nric?: string
          payment_type?: string | null
          phone?: string | null
          position?: string | null
          residency_status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          applied_date: string | null
          created_at: string | null
          days_requested: number
          employee_id: string | null
          end_date: string
          id: number
          medical_certificate: string | null
          reason: string | null
          reviewed_by: string | null
          reviewed_date: string | null
          start_date: string
          status: string
          type: string
        }
        Insert: {
          applied_date?: string | null
          created_at?: string | null
          days_requested: number
          employee_id?: string | null
          end_date: string
          id?: number
          medical_certificate?: string | null
          reason?: string | null
          reviewed_by?: string | null
          reviewed_date?: string | null
          start_date: string
          status?: string
          type: string
        }
        Update: {
          applied_date?: string | null
          created_at?: string | null
          days_requested?: number
          employee_id?: string | null
          end_date?: string
          id?: number
          medical_certificate?: string | null
          reason?: string | null
          reviewed_by?: string | null
          reviewed_date?: string | null
          start_date?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_bookings: {
        Row: {
          created_at: string | null
          date: string
          duration: number
          employee_id: string | null
          id: number
          purpose: string
          status: string
          time_slot: string
        }
        Insert: {
          created_at?: string | null
          date: string
          duration: number
          employee_id?: string | null
          id?: number
          purpose: string
          status?: string
          time_slot: string
        }
        Update: {
          created_at?: string | null
          date?: string
          duration?: number
          employee_id?: string | null
          id?: number
          purpose?: string
          status?: string
          time_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
