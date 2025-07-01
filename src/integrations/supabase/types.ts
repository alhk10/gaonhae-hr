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
          clock_in_location: string | null
          clock_out_location: string | null
          created_at: string | null
          date: string
          employee_id: string | null
          hours_worked: number | null
          id: number
          location: string | null
          status: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          check_in?: string | null
          check_out?: string | null
          clock_in_location?: string | null
          clock_out_location?: string | null
          created_at?: string | null
          date: string
          employee_id?: string | null
          hours_worked?: number | null
          id?: number
          location?: string | null
          status: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          check_in?: string | null
          check_out?: string | null
          clock_in_location?: string | null
          clock_out_location?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string | null
          hours_worked?: number | null
          id?: number
          location?: string | null
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
      attendance_settings: {
        Row: {
          branch_name: string
          created_at: string | null
          friday_end: string | null
          friday_start: string | null
          grace_period_minutes: number | null
          id: string
          is_active: boolean | null
          monday_end: string | null
          monday_start: string | null
          saturday_end: string | null
          saturday_start: string | null
          sunday_end: string | null
          sunday_start: string | null
          thursday_end: string | null
          thursday_start: string | null
          tuesday_end: string | null
          tuesday_start: string | null
          updated_at: string | null
          wednesday_end: string | null
          wednesday_start: string | null
        }
        Insert: {
          branch_name: string
          created_at?: string | null
          friday_end?: string | null
          friday_start?: string | null
          grace_period_minutes?: number | null
          id?: string
          is_active?: boolean | null
          monday_end?: string | null
          monday_start?: string | null
          saturday_end?: string | null
          saturday_start?: string | null
          sunday_end?: string | null
          sunday_start?: string | null
          thursday_end?: string | null
          thursday_start?: string | null
          tuesday_end?: string | null
          tuesday_start?: string | null
          updated_at?: string | null
          wednesday_end?: string | null
          wednesday_start?: string | null
        }
        Update: {
          branch_name?: string
          created_at?: string | null
          friday_end?: string | null
          friday_start?: string | null
          grace_period_minutes?: number | null
          id?: string
          is_active?: boolean | null
          monday_end?: string | null
          monday_start?: string | null
          saturday_end?: string | null
          saturday_start?: string | null
          sunday_end?: string | null
          sunday_start?: string | null
          thursday_end?: string | null
          thursday_start?: string | null
          tuesday_end?: string | null
          tuesday_start?: string | null
          updated_at?: string | null
          wednesday_end?: string | null
          wednesday_start?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string
          color: string
          created_at: string | null
          id: string
          name: string
          total_slots: number
          updated_at: string | null
        }
        Insert: {
          address: string
          color?: string
          created_at?: string | null
          id: string
          name: string
          total_slots?: number
          updated_at?: string | null
        }
        Update: {
          address?: string
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          total_slots?: number
          updated_at?: string | null
        }
        Relationships: []
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
      employee_page_access: {
        Row: {
          apply_leave: boolean | null
          created_at: string | null
          employee_id: string | null
          id: number
          my_attendance: boolean | null
          payslips: boolean | null
          profile: boolean | null
          slot_booking_employee: boolean | null
          submit_claim: boolean | null
        }
        Insert: {
          apply_leave?: boolean | null
          created_at?: string | null
          employee_id?: string | null
          id?: number
          my_attendance?: boolean | null
          payslips?: boolean | null
          profile?: boolean | null
          slot_booking_employee?: boolean | null
          submit_claim?: boolean | null
        }
        Update: {
          apply_leave?: boolean | null
          created_at?: string | null
          employee_id?: string | null
          id?: number
          my_attendance?: boolean | null
          payslips?: boolean | null
          profile?: boolean | null
          slot_booking_employee?: boolean | null
          submit_claim?: boolean | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          address: string | null
          bank_account: string
          bank_name: string
          base_salary: number | null
          created_at: string | null
          daily_rate: number | null
          daily_weekday_rate: number | null
          daily_weekend_rate: number | null
          date_of_birth: string
          department: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          join_date: string | null
          name: string
          nric: string
          payment_type: string | null
          phone: string | null
          position: string | null
          residency_status: string
          resign_date: string | null
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
          daily_weekday_rate?: number | null
          daily_weekend_rate?: number | null
          date_of_birth: string
          department?: string | null
          email?: string | null
          hourly_rate?: number | null
          id: string
          join_date?: string | null
          name: string
          nric: string
          payment_type?: string | null
          phone?: string | null
          position?: string | null
          residency_status: string
          resign_date?: string | null
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
          daily_weekday_rate?: number | null
          daily_weekend_rate?: number | null
          date_of_birth?: string
          department?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          join_date?: string | null
          name?: string
          nric?: string
          payment_type?: string | null
          phone?: string | null
          position?: string | null
          residency_status?: string
          resign_date?: string | null
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
      leave_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_days: number
          name: string
          requires_documents: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_days?: number
          name: string
          requires_documents?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_days?: number
          name?: string
          requires_documents?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payroll_records: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          month: string
          payroll_data: Json
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id: string
          month: string
          payroll_data: Json
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          month?: string
          payroll_data?: Json
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
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
      slot_bookings_new: {
        Row: {
          approved_by: string | null
          approved_on: string | null
          booked_on: string
          branch_id: string
          branch_name: string
          created_at: string | null
          date: string
          employee_id: string
          employee_name: string
          id: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          approved_on?: string | null
          booked_on?: string
          branch_id: string
          branch_name: string
          created_at?: string | null
          date: string
          employee_id: string
          employee_name: string
          id: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          approved_on?: string | null
          booked_on?: string
          branch_id?: string
          branch_name?: string
          created_at?: string | null
          date?: string
          employee_id?: string
          employee_name?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slot_bookings_new_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_bookings_new_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      system_allowances: {
        Row: {
          created_at: string | null
          default_amount: number | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          default_amount?: number | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          default_amount?: number | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      system_deductions: {
        Row: {
          created_at: string | null
          default_amount: number | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          default_amount?: number | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          default_amount?: number | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      weekly_slot_config: {
        Row: {
          branch_id: string
          created_at: string | null
          friday: number
          id: string
          monday: number
          saturday: number
          sunday: number
          thursday: number
          tuesday: number
          updated_at: string | null
          wednesday: number
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          friday?: number
          id?: string
          monday?: number
          saturday?: number
          sunday?: number
          thursday?: number
          tuesday?: number
          updated_at?: string | null
          wednesday?: number
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          friday?: number
          id?: string
          monday?: number
          saturday?: number
          sunday?: number
          thursday?: number
          tuesday?: number
          updated_at?: string | null
          wednesday?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_slot_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
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
