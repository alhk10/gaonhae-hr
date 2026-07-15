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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accounting_backfill_runs: {
        Row: {
          created_at: string
          error: string | null
          force: boolean
          from_date: string | null
          id: string
          modules: string[]
          run_at: string
          run_by: string | null
          status: string
          summary: Json
          to_date: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          force?: boolean
          from_date?: string | null
          id?: string
          modules?: string[]
          run_at?: string
          run_by?: string | null
          status?: string
          summary?: Json
          to_date?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          force?: boolean
          from_date?: string | null
          id?: string
          modules?: string[]
          run_at?: string
          run_by?: string | null
          status?: string
          summary?: Json
          to_date?: string | null
        }
        Relationships: []
      }
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
          slotBooking: boolean | null
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
          slotBooking?: boolean | null
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
          slotBooking?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_access_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
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
      attendance_statuses: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      booking_statuses: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      branch_operating_schedule: {
        Row: {
          branch_id: string
          close_time: string | null
          created_at: string | null
          id: string
          is_open: boolean
          notes: string | null
          open_time: string | null
          updated_at: string | null
          weekday: number
        }
        Insert: {
          branch_id: string
          close_time?: string | null
          created_at?: string | null
          id?: string
          is_open?: boolean
          notes?: string | null
          open_time?: string | null
          updated_at?: string | null
          weekday: number
        }
        Update: {
          branch_id?: string
          close_time?: string | null
          created_at?: string | null
          id?: string
          is_open?: boolean
          notes?: string | null
          open_time?: string | null
          updated_at?: string | null
          weekday?: number
        }
        Relationships: []
      }
      branch_profit_loss_entries: {
        Row: {
          amount: number
          branch_id: string
          category: string
          cost_price: number | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_percentage: number | null
          id: string
          month: number
          quantity: number | null
          sales_amount: number | null
          share_percentage: number | null
          subcategory: string
          type: string
          updated_at: string
          updated_by: string | null
          year: number
        }
        Insert: {
          amount?: number
          branch_id: string
          category: string
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          month: number
          quantity?: number | null
          sales_amount?: number | null
          share_percentage?: number | null
          subcategory: string
          type: string
          updated_at?: string
          updated_by?: string | null
          year: number
        }
        Update: {
          amount?: number
          branch_id?: string
          category?: string
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          month?: number
          quantity?: number | null
          sales_amount?: number | null
          share_percentage?: number | null
          subcategory?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          year?: number
        }
        Relationships: []
      }
      branch_timetables: {
        Row: {
          age_from: number | null
          age_group: string | null
          age_to: number | null
          belt_levels: string[] | null
          belt_range_max: string | null
          belt_range_min: string | null
          branch_id: string
          class_type: string
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          instructor_name: string | null
          is_active: boolean | null
          max_capacity: number | null
          start_time: string
          updated_at: string
          updated_by: string | null
          weekday: number
        }
        Insert: {
          age_from?: number | null
          age_group?: string | null
          age_to?: number | null
          belt_levels?: string[] | null
          belt_range_max?: string | null
          belt_range_min?: string | null
          branch_id: string
          class_type: string
          created_at?: string
          created_by?: string | null
          end_time: string
          id?: string
          instructor_name?: string | null
          is_active?: boolean | null
          max_capacity?: number | null
          start_time: string
          updated_at?: string
          updated_by?: string | null
          weekday: number
        }
        Update: {
          age_from?: number | null
          age_group?: string | null
          age_to?: number | null
          belt_levels?: string[] | null
          belt_range_max?: string | null
          belt_range_min?: string | null
          branch_id?: string
          class_type?: string
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          instructor_name?: string | null
          is_active?: boolean | null
          max_capacity?: number | null
          start_time?: string
          updated_at?: string
          updated_by?: string | null
          weekday?: number
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string
          color: string
          country: string | null
          created_at: string | null
          currency: string | null
          id: string
          name: string
          stripe_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          color?: string
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id: string
          name: string
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          color?: string
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          name?: string
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      brand_settings: {
        Row: {
          branch_id: string | null
          caption_style: string | null
          created_at: string
          default_hashtags: string[] | null
          id: string
          keywords: string[] | null
          language: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          caption_style?: string | null
          created_at?: string
          default_hashtags?: string[] | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          caption_style?: string | null
          created_at?: string
          default_hashtags?: string[] | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      cctv_camera_secrets: {
        Row: {
          camera_id: string
          created_at: string
          id: string
          password: string | null
          rtsp_url: string
          updated_at: string
          username: string | null
        }
        Insert: {
          camera_id: string
          created_at?: string
          id?: string
          password?: string | null
          rtsp_url: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          camera_id?: string
          created_at?: string
          id?: string
          password?: string | null
          rtsp_url?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cctv_camera_secrets_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: true
            referencedRelation: "cctv_cameras"
            referencedColumns: ["id"]
          },
        ]
      }
      cctv_cameras: {
        Row: {
          branch_id: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          mediamtx_path: string
          name: string
          supports_playback: boolean
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          mediamtx_path: string
          name: string
          supports_playback?: boolean
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          mediamtx_path?: string
          name?: string
          supports_playback?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cctv_cameras_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          code: string
          country: string
          created_at: string
          default_tax_code_id: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          sort_order: number
          subtype: string | null
          system_account: boolean
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          country: string
          created_at?: string
          default_tax_code_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          subtype?: string | null
          system_account?: boolean
          type: string
          updated_at?: string
        }
        Update: {
          code?: string
          country?: string
          created_at?: string
          default_tax_code_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
          subtype?: string | null
          system_account?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_default_tax_code_id_fkey"
            columns: ["default_tax_code_id"]
            isOneToOne: false
            referencedRelation: "tax_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_types: {
        Row: {
          co_pay: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          limit_amount: number | null
          name: string
          updated_at: string
        }
        Insert: {
          co_pay?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          limit_amount?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          co_pay?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          limit_amount?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          amount: number
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      class_attendance: {
        Row: {
          attendance_method: string | null
          branch_id: string
          class_date: string
          created_at: string
          created_by: string | null
          entitlement_id: string | null
          id: string
          notes: string | null
          recorded_at: string | null
          recorded_by: string | null
          status: string
          student_id: string
          timetable_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attendance_method?: string | null
          branch_id: string
          class_date: string
          created_at?: string
          created_by?: string | null
          entitlement_id?: string | null
          id?: string
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          status: string
          student_id: string
          timetable_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attendance_method?: string | null
          branch_id?: string
          class_date?: string
          created_at?: string
          created_by?: string | null
          entitlement_id?: string | null
          id?: string
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          status?: string
          student_id?: string
          timetable_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_attendance_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_attendance_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "branch_timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      class_pricing_tiers: {
        Row: {
          branch_id: string
          class_type: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          price_per_lesson: number | null
          price_per_week: number
          tier_display_name: string
          tier_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id: string
          class_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          price_per_lesson?: number | null
          price_per_week?: number
          tier_display_name: string
          tier_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string
          class_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          price_per_lesson?: number | null
          price_per_week?: number
          tier_display_name?: string
          tier_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      clock_status: {
        Row: {
          clock_in_time: string | null
          clock_out_time: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          location: string | null
          status: string
          updated_at: string
        }
        Insert: {
          clock_in_time?: string | null
          clock_out_time?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          location?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          clock_in_time?: string | null
          clock_out_time?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          location?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      competition_event_categories: {
        Row: {
          created_at: string
          display_order: number
          event_id: string
          id: string
          is_active: boolean
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          event_id: string
          id?: string
          is_active?: boolean
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          event_id?: string
          id?: string
          is_active?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_event_categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "competition_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_event_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_events: {
        Row: {
          coaching_amount: number | null
          coaching_label: string | null
          coaching_product_id: string | null
          coaching_required: boolean
          created_at: string
          display_order: number
          extra_lines: Json
          id: string
          indemnity_clause: string | null
          indemnity_template_name: string | null
          indemnity_template_url: string | null
          is_active: boolean
          name: string
          require_grading_card: boolean
          require_indemnity_form: boolean
          require_passport: boolean
          require_photo: boolean
          updated_at: string
        }
        Insert: {
          coaching_amount?: number | null
          coaching_label?: string | null
          coaching_product_id?: string | null
          coaching_required?: boolean
          created_at?: string
          display_order?: number
          extra_lines?: Json
          id?: string
          indemnity_clause?: string | null
          indemnity_template_name?: string | null
          indemnity_template_url?: string | null
          is_active?: boolean
          name: string
          require_grading_card?: boolean
          require_indemnity_form?: boolean
          require_passport?: boolean
          require_photo?: boolean
          updated_at?: string
        }
        Update: {
          coaching_amount?: number | null
          coaching_label?: string | null
          coaching_product_id?: string | null
          coaching_required?: boolean
          created_at?: string
          display_order?: number
          extra_lines?: Json
          id?: string
          indemnity_clause?: string | null
          indemnity_template_name?: string | null
          indemnity_template_url?: string | null
          is_active?: boolean
          name?: string
          require_grading_card?: boolean
          require_indemnity_form?: boolean
          require_passport?: boolean
          require_photo?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_events_coaching_product_id_fkey"
            columns: ["coaching_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_extra_line_presets: {
        Row: {
          created_at: string
          default_amount: number
          display_order: number
          id: string
          is_active: boolean
          name: string
          requires_weight: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_amount?: number
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          requires_weight?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_amount?: number
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          requires_weight?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      competition_payment_submissions: {
        Row: {
          amount: number | null
          branch_id: string
          category_product_ids: string[]
          certificate_url: string | null
          coaching_amount: number | null
          coaching_label: string | null
          coaching_product_id: string | null
          competition_at: string | null
          court: string | null
          created_at: string
          current_belt: string | null
          date_of_birth: string | null
          display_name: string | null
          email: string | null
          event_id: string | null
          extra_lines: Json
          first_name: string
          gender: string | null
          grading_card_urls: string[]
          id: string
          indemnity_form_url: string | null
          last_name: string
          matched_invoice_id: string | null
          matched_student_id: string | null
          notes: string | null
          passport_url: string | null
          payment_method: string
          photo_url: string | null
          poomsae_1: string | null
          poomsae_2: string | null
          proof_url: string
          reference_number: string
          reporting_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          signature_url: string | null
          status: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          amount?: number | null
          branch_id: string
          category_product_ids?: string[]
          certificate_url?: string | null
          coaching_amount?: number | null
          coaching_label?: string | null
          coaching_product_id?: string | null
          competition_at?: string | null
          court?: string | null
          created_at?: string
          current_belt?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          event_id?: string | null
          extra_lines?: Json
          first_name: string
          gender?: string | null
          grading_card_urls?: string[]
          id?: string
          indemnity_form_url?: string | null
          last_name: string
          matched_invoice_id?: string | null
          matched_student_id?: string | null
          notes?: string | null
          passport_url?: string | null
          payment_method: string
          photo_url?: string | null
          poomsae_1?: string | null
          poomsae_2?: string | null
          proof_url: string
          reference_number?: string
          reporting_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_url?: string | null
          status?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          amount?: number | null
          branch_id?: string
          category_product_ids?: string[]
          certificate_url?: string | null
          coaching_amount?: number | null
          coaching_label?: string | null
          coaching_product_id?: string | null
          competition_at?: string | null
          court?: string | null
          created_at?: string
          current_belt?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          event_id?: string | null
          extra_lines?: Json
          first_name?: string
          gender?: string | null
          grading_card_urls?: string[]
          id?: string
          indemnity_form_url?: string | null
          last_name?: string
          matched_invoice_id?: string | null
          matched_student_id?: string | null
          notes?: string | null
          passport_url?: string | null
          payment_method?: string
          photo_url?: string | null
          poomsae_1?: string | null
          poomsae_2?: string | null
          proof_url?: string
          reference_number?: string
          reporting_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_url?: string | null
          status?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_payment_submissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_payment_submissions_coaching_product_id_fkey"
            columns: ["coaching_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_payment_submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "competition_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_payment_submissions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_payment_submissions_matched_student_id_fkey"
            columns: ["matched_student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_suggestion: Json | null
          branch_id: string | null
          created_at: string
          custom_label: string | null
          document_level: string | null
          document_type: string
          extracted_data: Json | null
          file_mime: string | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          file_url: string
          id: string
          linked_id: string | null
          linked_type: string | null
          match_confidence: number | null
          match_status: string
          notes: string | null
          updated_at: string
          uploaded_by_email: string | null
        }
        Insert: {
          ai_suggestion?: Json | null
          branch_id?: string | null
          created_at?: string
          custom_label?: string | null
          document_level?: string | null
          document_type: string
          extracted_data?: Json | null
          file_mime?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          linked_id?: string | null
          linked_type?: string | null
          match_confidence?: number | null
          match_status?: string
          notes?: string | null
          updated_at?: string
          uploaded_by_email?: string | null
        }
        Update: {
          ai_suggestion?: Json | null
          branch_id?: string | null
          created_at?: string
          custom_label?: string | null
          document_level?: string | null
          document_type?: string
          extracted_data?: Json | null
          file_mime?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          linked_id?: string | null
          linked_type?: string | null
          match_confidence?: number | null
          match_status?: string
          notes?: string | null
          updated_at?: string
          uploaded_by_email?: string | null
        }
        Relationships: []
      }
      education_resources: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          file_urls: Json | null
          id: string
          is_active: boolean | null
          links: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_urls?: Json | null
          id?: string
          is_active?: boolean | null
          links?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_urls?: Json | null
          id?: string
          is_active?: boolean | null
          links?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_branch_access: {
        Row: {
          branch_id: string
          can_approve_changes: boolean | null
          can_view_dashboard: boolean | null
          created_at: string | null
          employee_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          can_approve_changes?: boolean | null
          can_view_dashboard?: boolean | null
          created_at?: string | null
          employee_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          can_approve_changes?: boolean | null
          can_view_dashboard?: boolean | null
          created_at?: string | null
          employee_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_branch_access_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_branch_access_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_branch_access_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invoice_access: {
        Row: {
          branch_id: string
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          created_at: string | null
          created_by: string | null
          employee_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_page_access: {
        Row: {
          apply_leave: boolean | null
          cctv_monitoring: boolean | null
          created_at: string | null
          employee_id: string | null
          id: number
          my_attendance: boolean | null
          payslips: boolean | null
          profile: boolean | null
          slot_booking_employee: boolean | null
          social_media: boolean | null
          submit_claim: boolean | null
        }
        Insert: {
          apply_leave?: boolean | null
          cctv_monitoring?: boolean | null
          created_at?: string | null
          employee_id?: string | null
          id?: number
          my_attendance?: boolean | null
          payslips?: boolean | null
          profile?: boolean | null
          slot_booking_employee?: boolean | null
          social_media?: boolean | null
          submit_claim?: boolean | null
        }
        Update: {
          apply_leave?: boolean | null
          cctv_monitoring?: boolean | null
          created_at?: string | null
          employee_id?: string | null
          id?: number
          my_attendance?: boolean | null
          payslips?: boolean | null
          profile?: boolean | null
          slot_booking_employee?: boolean | null
          social_media?: boolean | null
          submit_claim?: boolean | null
        }
        Relationships: []
      }
      employee_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          additional_wages_default: number | null
          address: string | null
          agency_fund_amount: number | null
          bank_account: string
          bank_name: string
          base_salary: number | null
          cpf_contribution_type: string | null
          created_at: string | null
          date_of_birth: string
          department: string | null
          display_name: string | null
          email: string | null
          first_name: string
          hourly_rate: number | null
          id: string
          join_date: string | null
          last_name: string | null
          name: string
          nric: string
          payment_type: string | null
          phone: string | null
          position: string | null
          pr_start_date: string | null
          qualifications: Json | null
          residency_status: string
          resign_date: string | null
          sdl_payable: boolean
          security_pin: string | null
          self_help_group: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          additional_wages_default?: number | null
          address?: string | null
          agency_fund_amount?: number | null
          bank_account: string
          bank_name: string
          base_salary?: number | null
          cpf_contribution_type?: string | null
          created_at?: string | null
          date_of_birth: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          first_name: string
          hourly_rate?: number | null
          id: string
          join_date?: string | null
          last_name?: string | null
          name: string
          nric: string
          payment_type?: string | null
          phone?: string | null
          position?: string | null
          pr_start_date?: string | null
          qualifications?: Json | null
          residency_status: string
          resign_date?: string | null
          sdl_payable?: boolean
          security_pin?: string | null
          self_help_group?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          additional_wages_default?: number | null
          address?: string | null
          agency_fund_amount?: number | null
          bank_account?: string
          bank_name?: string
          base_salary?: number | null
          cpf_contribution_type?: string | null
          created_at?: string | null
          date_of_birth?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string
          hourly_rate?: number | null
          id?: string
          join_date?: string | null
          last_name?: string | null
          name?: string
          nric?: string
          payment_type?: string | null
          phone?: string | null
          position?: string | null
          pr_start_date?: string | null
          qualifications?: Json | null
          residency_status?: string
          resign_date?: string | null
          sdl_payable?: boolean
          security_pin?: string | null
          self_help_group?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          belt_level_scope: string | null
          branch_scope: string | null
          class_type_scope: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          product_id: string | null
          sessions_remaining: number | null
          sessions_total: number
          sessions_used: number
          source_id: string | null
          source_type: string
          student_id: string
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          belt_level_scope?: string | null
          branch_scope?: string | null
          class_type_scope?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          product_id?: string | null
          sessions_remaining?: number | null
          sessions_total?: number
          sessions_used?: number
          source_id?: string | null
          source_type: string
          student_id: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          belt_level_scope?: string | null
          branch_scope?: string | null
          class_type_scope?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          product_id?: string | null
          sessions_remaining?: number | null
          sessions_total?: number
          sessions_used?: number
          source_id?: string | null
          source_type?: string
          student_id?: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_login_attempts: {
        Row: {
          attempt_time: string | null
          email: string
          id: string
          ip_address: string | null
        }
        Insert: {
          attempt_time?: string | null
          email: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          attempt_time?: string | null
          email?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      fiscal_periods: {
        Row: {
          country: string
          created_at: string
          id: string
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          period: string
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          period: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          period?: string
          updated_at?: string
        }
        Relationships: []
      }
      grading_deletion_requests: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          registration_id: string
          requested_by: string
          requested_by_email: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          student_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          registration_id: string
          requested_by: string
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          student_name: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          registration_id?: string
          requested_by?: string
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_deletion_requests_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "grading_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_payment_submissions: {
        Row: {
          amount: number | null
          branch_id: string
          created_at: string
          current_belt: string | null
          date_of_birth: string
          display_name: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          matched_invoice_id: string | null
          matched_student_id: string | null
          notes: string | null
          payment_method: string
          proof_url: string | null
          reference_number: string | null
          remark: string | null
          resolved_grading_slot_id: string | null
          resolved_product_id: string | null
          result: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          branch_id: string
          created_at?: string
          current_belt?: string | null
          date_of_birth: string
          display_name?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          matched_invoice_id?: string | null
          matched_student_id?: string | null
          notes?: string | null
          payment_method?: string
          proof_url?: string | null
          reference_number?: string | null
          remark?: string | null
          resolved_grading_slot_id?: string | null
          resolved_product_id?: string | null
          result?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          branch_id?: string
          created_at?: string
          current_belt?: string | null
          date_of_birth?: string
          display_name?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          matched_invoice_id?: string | null
          matched_student_id?: string | null
          notes?: string | null
          payment_method?: string
          proof_url?: string | null
          reference_number?: string | null
          remark?: string | null
          resolved_grading_slot_id?: string | null
          resolved_product_id?: string | null
          result?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_payment_submissions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_payment_submissions_matched_student_id_fkey"
            columns: ["matched_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_payment_submissions_resolved_grading_slot_id_fkey"
            columns: ["resolved_grading_slot_id"]
            isOneToOne: false
            referencedRelation: "grading_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_payment_submissions_resolved_product_id_fkey"
            columns: ["resolved_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_registrations: {
        Row: {
          certificate_ii_issued: boolean | null
          certificate_issued: boolean | null
          created_at: string | null
          created_by: string | null
          current_belt: string
          display_name: string | null
          grading_slot_id: string | null
          id: string
          invoice_item_id: string | null
          notes: string | null
          ready_for_grading: boolean | null
          remark: string | null
          result: string | null
          result_manual_override: boolean
          scorecard: Json
          student_id: string
          target_belt: string
          term_id: string | null
        }
        Insert: {
          certificate_ii_issued?: boolean | null
          certificate_issued?: boolean | null
          created_at?: string | null
          created_by?: string | null
          current_belt: string
          display_name?: string | null
          grading_slot_id?: string | null
          id?: string
          invoice_item_id?: string | null
          notes?: string | null
          ready_for_grading?: boolean | null
          remark?: string | null
          result?: string | null
          result_manual_override?: boolean
          scorecard?: Json
          student_id: string
          target_belt: string
          term_id?: string | null
        }
        Update: {
          certificate_ii_issued?: boolean | null
          certificate_issued?: boolean | null
          created_at?: string | null
          created_by?: string | null
          current_belt?: string
          display_name?: string | null
          grading_slot_id?: string | null
          id?: string
          invoice_item_id?: string | null
          notes?: string | null
          ready_for_grading?: boolean | null
          remark?: string | null
          result?: string | null
          result_manual_override?: boolean
          scorecard?: Json
          student_id?: string
          target_belt?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_registrations_grading_slot_id_fkey"
            columns: ["grading_slot_id"]
            isOneToOne: false
            referencedRelation: "grading_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_registrations_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_registrations_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "term_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_slots: {
        Row: {
          available_branch_ids: string[] | null
          belt_levels: string[] | null
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          end_time: string | null
          examiner_name: string | null
          grading_date: string
          grading_product_ids: string[] | null
          id: string
          location: string | null
          max_age: number | null
          max_capacity: number | null
          min_age: number | null
          notes: string | null
          start_time: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          available_branch_ids?: string[] | null
          belt_levels?: string[] | null
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          examiner_name?: string | null
          grading_date: string
          grading_product_ids?: string[] | null
          id?: string
          location?: string | null
          max_age?: number | null
          max_capacity?: number | null
          min_age?: number | null
          notes?: string | null
          start_time?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          available_branch_ids?: string[] | null
          belt_levels?: string[] | null
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          examiner_name?: string | null
          grading_date?: string
          grading_product_ids?: string[] | null
          id?: string
          location?: string | null
          max_age?: number | null
          max_capacity?: number | null
          min_age?: number | null
          notes?: string | null
          start_time?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_slots_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_term_scorecard_columns: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          label: string
          position: number
          term_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          label: string
          position?: number
          term_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          label?: string
          position?: number
          term_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      guards_purchases: {
        Row: {
          branch_id: string | null
          collected: boolean
          collected_at: string | null
          collected_by: string | null
          created_at: string
          current_belt: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          gender: string | null
          gst_amount: number
          id: string
          invoice_id: string | null
          items: Json
          last_name: string
          matched_student_id: string | null
          notes: string | null
          payment_method: string | null
          phone: string | null
          proof_url: string | null
          reference_number: string | null
          sale_status: string
          subtotal: number
          total: number
          updated_at: string
          variant_selections: Json
        }
        Insert: {
          branch_id?: string | null
          collected?: boolean
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          current_belt?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          gst_amount?: number
          id?: string
          invoice_id?: string | null
          items?: Json
          last_name: string
          matched_student_id?: string | null
          notes?: string | null
          payment_method?: string | null
          phone?: string | null
          proof_url?: string | null
          reference_number?: string | null
          sale_status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          variant_selections?: Json
        }
        Update: {
          branch_id?: string | null
          collected?: boolean
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          current_belt?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          gst_amount?: number
          id?: string
          invoice_id?: string | null
          items?: Json
          last_name?: string
          matched_student_id?: string | null
          notes?: string | null
          payment_method?: string | null
          phone?: string | null
          proof_url?: string | null
          reference_number?: string | null
          sale_status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          variant_selections?: Json
        }
        Relationships: [
          {
            foreignKeyName: "guards_purchases_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guards_purchases_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guards_purchases_matched_student_id_fkey"
            columns: ["matched_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          created_by: string | null
          id: string
          location_id: string
          product_id: string
          quantity_on_hand: number
          quantity_reserved: number
          reorder_point: number | null
          reorder_quantity: number | null
          size_variant: string | null
          updated_at: string
          updated_by: string | null
          variant_combination: Json | null
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id: string
          product_id: string
          quantity_on_hand?: number
          quantity_reserved?: number
          reorder_point?: number | null
          reorder_quantity?: number | null
          size_variant?: string | null
          updated_at?: string
          updated_by?: string | null
          variant_combination?: Json | null
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string
          product_id?: string
          quantity_on_hand?: number
          quantity_reserved?: number
          reorder_point?: number | null
          reorder_quantity?: number | null
          size_variant?: string | null
          updated_at?: string
          updated_by?: string | null
          variant_combination?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location_id: string
          movement_date: string | null
          movement_type: string
          notes: string | null
          product_id: string
          quantity_delta: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          size_variant: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location_id: string
          movement_date?: string | null
          movement_type: string
          notes?: string | null
          product_id: string
          quantity_delta: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          size_variant?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string
          movement_date?: string | null
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity_delta?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          size_variant?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          location_id: string
          notes: string | null
          order_number: string
          product_id: string
          quantity: number
          received_at: string | null
          requested_by: string
          requested_by_email: string | null
          size_variant: string | null
          status: string
          total_cost: number | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          location_id: string
          notes?: string | null
          order_number: string
          product_id: string
          quantity: number
          received_at?: string | null
          requested_by: string
          requested_by_email?: string | null
          size_variant?: string | null
          status?: string
          total_cost?: number | null
          unit_cost: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          order_number?: string
          product_id?: string
          quantity?: number
          received_at?: string | null
          requested_by?: string
          requested_by_email?: string | null
          size_variant?: string | null
          status?: string
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfer_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          from_branch_id: string
          id: string
          product_id: string
          quantity: number
          reason: string | null
          requested_by: string
          size_variant: string | null
          status: string
          to_branch_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          from_branch_id: string
          id?: string
          product_id: string
          quantity: number
          reason?: string | null
          requested_by: string
          size_variant?: string | null
          status?: string
          to_branch_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          from_branch_id?: string
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          requested_by?: string
          size_variant?: string | null
          status?: string
          to_branch_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfer_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_action_requests: {
        Row: {
          action_type: string
          created_at: string
          id: string
          invoice_id: string
          invoice_number: string | null
          rejection_reason: string | null
          request_data: Json
          requested_by: string | null
          requested_by_email: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_name: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          invoice_id: string
          invoice_number?: string | null
          rejection_reason?: string | null
          request_data?: Json
          requested_by?: string | null
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_name?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          invoice_id?: string
          invoice_number?: string | null
          rejection_reason?: string | null
          request_data?: Json
          requested_by?: string | null
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_action_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_change_logs: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_email: string | null
          changes: Json | null
          created_at: string
          field_name: string | null
          id: string
          invoice_id: string
          ip_address: string | null
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_email?: string | null
          changes?: Json | null
          created_at?: string
          field_name?: string | null
          id?: string
          invoice_id: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_email?: string | null
          changes?: Json | null
          created_at?: string
          field_name?: string | null
          id?: string
          invoice_id?: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_change_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_deletion_requests: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          reason: string | null
          requested_by: string
          requested_by_email: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          reason?: string | null
          requested_by: string
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          reason?: string | null
          requested_by?: string
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_deletion_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_discount_approvals: {
        Row: {
          approval_reason: string | null
          branch_name: string | null
          created_at: string
          id: string
          invoice_data: Json
          item_count: number
          rejection_reason: string | null
          requested_by: string | null
          requested_by_email: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_name: string
          total_amount: number
          total_discount: number
        }
        Insert: {
          approval_reason?: string | null
          branch_name?: string | null
          created_at?: string
          id?: string
          invoice_data: Json
          item_count?: number
          rejection_reason?: string | null
          requested_by?: string | null
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_name: string
          total_amount?: number
          total_discount?: number
        }
        Update: {
          approval_reason?: string | null
          branch_name?: string | null
          created_at?: string
          id?: string
          invoice_data?: Json
          item_count?: number
          rejection_reason?: string | null
          requested_by?: string | null
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_name?: string
          total_amount?: number
          total_discount?: number
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          invoice_id: string
          metadata: Json | null
          product_id: string
          quantity: number
          size_variant: string | null
          tax_amount: number
          tax_rate: number
          total_amount: number
          unit_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          invoice_id: string
          metadata?: Json | null
          product_id: string
          quantity?: number
          size_variant?: string | null
          tax_amount?: number
          tax_rate?: number
          total_amount: number
          unit_price: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          invoice_id?: string
          metadata?: Json | null
          product_id?: string
          quantity?: number
          size_variant?: string | null
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_templates: {
        Row: {
          bank_transfer_info: string | null
          branch_id: string | null
          country: string | null
          created_at: string
          created_by: string | null
          default_internal_notes: string | null
          default_notes: string | null
          default_payment_terms_days: number | null
          description: string | null
          footer_text: string | null
          id: string
          is_active: boolean | null
          letterhead_url: string | null
          logo_url: string | null
          name: string
          paynow_qr_url: string | null
          template_items: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_transfer_info?: string | null
          branch_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          default_internal_notes?: string | null
          default_notes?: string | null
          default_payment_terms_days?: number | null
          description?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean | null
          letterhead_url?: string | null
          logo_url?: string | null
          name: string
          paynow_qr_url?: string | null
          template_items?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_transfer_info?: string | null
          branch_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          default_internal_notes?: string | null
          default_notes?: string | null
          default_payment_terms_days?: number | null
          description?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean | null
          letterhead_url?: string | null
          logo_url?: string | null
          name?: string
          paynow_qr_url?: string | null
          template_items?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_paid: number
          balance_due: number
          branch_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number
          due_date: string | null
          id: string
          internal_notes: string | null
          invoice_number: string
          issue_date: string | null
          notes: string | null
          payment_terms_days: number | null
          status: string | null
          student_id: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_paid?: number
          balance_due?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_number: string
          issue_date?: string | null
          notes?: string | null
          payment_terms_days?: number | null
          status?: string | null
          student_id: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_paid?: number
          balance_due?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_number?: string
          issue_date?: string | null
          notes?: string | null
          payment_terms_days?: number | null
          status?: string | null
          student_id?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          branch_id: string | null
          country: string
          created_at: string
          created_by: string | null
          entry_date: string
          entry_number: string | null
          id: string
          narration: string | null
          period: string
          posted_at: string | null
          posted_by: string | null
          reference: string | null
          source_id: string | null
          source_type: string
          status: string
          updated_at: string
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          branch_id?: string | null
          country: string
          created_at?: string
          created_by?: string | null
          entry_date: string
          entry_number?: string | null
          id?: string
          narration?: string | null
          period: string
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          branch_id?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_number?: string | null
          id?: string
          narration?: string | null
          period?: string
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_id: string
          branch_id: string | null
          contact_ref: string | null
          contact_type: string | null
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          journal_id: string
          line_no: number
          tax_amount: number
          tax_base_amount: number
          tax_code_id: string | null
        }
        Insert: {
          account_id: string
          branch_id?: string | null
          contact_ref?: string | null
          contact_type?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_id: string
          line_no?: number
          tax_amount?: number
          tax_base_amount?: number
          tax_code_id?: string | null
        }
        Update: {
          account_id?: string
          branch_id?: string | null
          contact_ref?: string | null
          contact_type?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_id?: string
          line_no?: number
          tax_amount?: number
          tax_base_amount?: number
          tax_code_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "v_ledger_lines"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "v_pnl_lines"
            referencedColumns: ["journal_id"]
          },
          {
            foreignKeyName: "journal_lines_tax_code_id_fkey"
            columns: ["tax_code_id"]
            isOneToOne: false
            referencedRelation: "tax_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_encashment_config: {
        Row: {
          created_at: string
          employee_id: string
          encashment_rate_per_day: number
          id: string
          is_active: boolean
          max_encashable_days: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          encashment_rate_per_day?: number
          id?: string
          is_active?: boolean
          max_encashable_days?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          encashment_rate_per_day?: number
          id?: string
          is_active?: boolean
          max_encashable_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_encashment_config_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_encashment_config_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_encashment_records: {
        Row: {
          created_at: string
          employee_id: string
          encashed_days: number
          id: string
          payroll_month: string | null
          payroll_year: number | null
          processed_by: string | null
          processed_date: string | null
          rate_per_day: number
          status: string
          total_encashment_amount: number
          unused_leave_days: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          encashed_days?: number
          id?: string
          payroll_month?: string | null
          payroll_year?: number | null
          processed_by?: string | null
          processed_date?: string | null
          rate_per_day?: number
          status?: string
          total_encashment_amount?: number
          unused_leave_days?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          encashed_days?: number
          id?: string
          payroll_month?: string | null
          payroll_year?: number | null
          processed_by?: string | null
          processed_date?: string | null
          rate_per_day?: number
          status?: string
          total_encashment_amount?: number
          unused_leave_days?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_encashment_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_encashment_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
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
      letter_templates: {
        Row: {
          address: string | null
          addressee_name: string | null
          body_text: string
          body_text_2: string | null
          closing_text: string
          company_name: string | null
          contact_number: string | null
          created_at: string
          created_by: string | null
          footer_text: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          salutation: string | null
          show_horizontal_line: boolean | null
          signatory_name: string | null
          signatory_position: string | null
          signature_image_url: string | null
          sort_order: number | null
          title: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          addressee_name?: string | null
          body_text: string
          body_text_2?: string | null
          closing_text: string
          company_name?: string | null
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          salutation?: string | null
          show_horizontal_line?: boolean | null
          signatory_name?: string | null
          signatory_position?: string | null
          signature_image_url?: string | null
          sort_order?: number | null
          title: string
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          addressee_name?: string | null
          body_text?: string
          body_text_2?: string | null
          closing_text?: string
          company_name?: string | null
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          salutation?: string | null
          show_horizontal_line?: boolean | null
          signatory_name?: string | null
          signatory_position?: string | null
          signature_image_url?: string | null
          sort_order?: number | null
          title?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      location_exceptions: {
        Row: {
          created_at: string | null
          created_by: string
          employee_id: string
          enabled: boolean
          expires_at: string | null
          id: string
          reason: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          employee_id: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          reason: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          employee_id?: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          reason?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_exceptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_exceptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      monday_holiday_leave_adjustments: {
        Row: {
          bonus_days_granted: number
          employee_id: string
          granted_date: string | null
          holiday_id: string
          id: string
        }
        Insert: {
          bonus_days_granted?: number
          employee_id: string
          granted_date?: string | null
          holiday_id: string
          id?: string
        }
        Update: {
          bonus_days_granted?: number
          employee_id?: string
          granted_date?: string | null
          holiday_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monday_holiday_leave_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monday_holiday_leave_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monday_holiday_leave_adjustments_holiday_id_fkey"
            columns: ["holiday_id"]
            isOneToOne: false
            referencedRelation: "public_holidays"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notice_payments: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          notice_id: string
          paid_by_email: string
          payment_method: string
          product_id: string | null
          proof_url: string | null
          reference_number: string | null
          status: string | null
          updated_at: string | null
          variant: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          notice_id: string
          paid_by_email: string
          payment_method: string
          product_id?: string | null
          proof_url?: string | null
          reference_number?: string | null
          status?: string | null
          updated_at?: string | null
          variant?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          notice_id?: string
          paid_by_email?: string
          payment_method?: string
          product_id?: string | null
          proof_url?: string | null
          reference_number?: string | null
          status?: string | null
          updated_at?: string | null
          variant?: string | null
        }
        Relationships: []
      }
      notices: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          content: string | null
          created_at: string | null
          created_by_branch_id: string | null
          created_by_email: string
          delete_on: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link: string | null
          payment_amount: number | null
          payment_product_id: string | null
          payment_variant: string | null
          subject: string
          target_age_max: number | null
          target_age_min: number | null
          target_belt_levels: string[] | null
          target_branches: string[] | null
          updated_at: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string | null
          created_by_branch_id?: string | null
          created_by_email: string
          delete_on?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link?: string | null
          payment_amount?: number | null
          payment_product_id?: string | null
          payment_variant?: string | null
          subject: string
          target_age_max?: number | null
          target_age_min?: number | null
          target_belt_levels?: string[] | null
          target_branches?: string[] | null
          updated_at?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string | null
          created_by_branch_id?: string | null
          created_by_email?: string
          delete_on?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link?: string | null
          payment_amount?: number | null
          payment_product_id?: string | null
          payment_variant?: string | null
          subject?: string
          target_age_max?: number | null
          target_age_min?: number | null
          target_belt_levels?: string[] | null
          target_branches?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          employee_id: string
          id: string
          metadata: Json | null
          sent_at: string
          template_key: string
        }
        Insert: {
          employee_id: string
          id?: string
          metadata?: Json | null
          sent_at?: string
          template_key: string
        }
        Update: {
          employee_id?: string
          id?: string
          metadata?: Json | null
          sent_at?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_subscriptions: {
        Row: {
          auth: string
          created_at: string
          employee_id: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          employee_id: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          employee_id?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_subscriptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_subscriptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          created_at: string
          enabled: boolean
          id: string
          template_key: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          enabled?: boolean
          id?: string
          template_key: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          enabled?: boolean
          id?: string
          template_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_branch_shares: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          notes: string | null
          share_percentage: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          share_percentage: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          share_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_branch_shares_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_branch_shares_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_branch_shares_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      password_history: {
        Row: {
          created_at: string | null
          email: string
          id: string
          password_hash: string
          salt: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          password_hash: string
          salt: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          password_hash?: string
          salt?: string
        }
        Relationships: []
      }
      payment_deletion_requests: {
        Row: {
          created_at: string
          id: string
          payment_id: string
          reason: string | null
          requested_by: string
          requested_by_email: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id: string
          reason?: string | null
          requested_by: string
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string
          reason?: string | null
          requested_by?: string
          requested_by_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_deletion_requests_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          is_verified: boolean
          notes: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          processed_by: string | null
          proof_of_payment_url: string | null
          reference_number: string | null
          updated_at: string
          updated_by: string | null
          verification_rejection_reason: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          is_verified?: boolean
          notes?: string | null
          payment_date?: string
          payment_method: string
          payment_number: string
          processed_by?: string | null
          proof_of_payment_url?: string | null
          reference_number?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_rejection_reason?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          is_verified?: boolean
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string
          processed_by?: string | null
          proof_of_payment_url?: string | null
          reference_number?: string | null
          updated_at?: string
          updated_by?: string | null
          verification_rejection_reason?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_monthly_overrides: {
        Row: {
          allowances: Json | null
          base_salary: number | null
          created_at: string | null
          deductions: Json | null
          employee_id: string
          hourly_rate: number | null
          id: string
          month: string
          updated_at: string | null
          year: number
        }
        Insert: {
          allowances?: Json | null
          base_salary?: number | null
          created_at?: string | null
          deductions?: Json | null
          employee_id: string
          hourly_rate?: number | null
          id?: string
          month: string
          updated_at?: string | null
          year: number
        }
        Update: {
          allowances?: Json | null
          base_salary?: number | null
          created_at?: string | null
          deductions?: Json | null
          employee_id?: string
          hourly_rate?: number | null
          id?: string
          month?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_monthly_overrides_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_monthly_overrides_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          cpf_paid: boolean | null
          cpf_paid_at: string | null
          cpf_paid_by: string | null
          created_at: string | null
          employee_id: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          is_locked: boolean | null
          month: string
          payroll_data: Json
          salary_paid: boolean | null
          salary_paid_at: string | null
          salary_paid_by: string | null
          status: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          cpf_paid?: boolean | null
          cpf_paid_at?: string | null
          cpf_paid_by?: string | null
          created_at?: string | null
          employee_id?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id: string
          is_locked?: boolean | null
          month: string
          payroll_data: Json
          salary_paid?: boolean | null
          salary_paid_at?: string | null
          salary_paid_by?: string | null
          status?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          cpf_paid?: boolean | null
          cpf_paid_at?: string | null
          cpf_paid_by?: string | null
          created_at?: string | null
          employee_id?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_locked?: boolean | null
          month?: string
          payroll_data?: Json
          salary_paid?: boolean | null
          salary_paid_at?: string | null
          salary_paid_by?: string | null
          status?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_categories: {
        Row: {
          created_at: string
          created_by: string | null
          default_cost_price: number | null
          id: string
          name: string
          sort_order: number | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_cost_price?: number | null
          id?: string
          name: string
          sort_order?: number | null
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_cost_price?: number | null
          id?: string
          name?: string
          sort_order?: number | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      price_rules: {
        Row: {
          belt_max: string | null
          belt_min: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          discount_percentage: number | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          price_override: number | null
          product_id: string
          rule_name: string
          tax_included: boolean | null
          tax_rate: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          belt_max?: string | null
          belt_min?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_percentage?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          price_override?: number | null
          product_id: string
          rule_name: string
          tax_included?: boolean | null
          tax_rate?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          belt_max?: string | null
          belt_min?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_percentage?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          price_override?: number | null
          product_id?: string
          rule_name?: string
          tax_included?: boolean | null
          tax_rate?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      product_variant_types: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          presets: Json | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          presets?: Json | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          presets?: Json | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          allowed_belt_levels: string[] | null
          allowed_class_types: string[] | null
          available_sizes: string[] | null
          available_variants: Json | null
          base_price: number
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_adhoc_lesson: boolean | null
          is_lesson: boolean | null
          is_recurring: boolean | null
          is_service: boolean
          kind: string | null
          lesson_days: string[] | null
          lessons_per_week: number | null
          max_age: number | null
          max_belt_level: string | null
          metadata: Json | null
          min_age: number | null
          min_belt_level: string | null
          name: string
          requires_belt_level: boolean | null
          requires_belt_rank: boolean | null
          requires_color: boolean | null
          requires_size: boolean | null
          session_count: number | null
          sku: string
          tax_rate: number | null
          term_id: string | null
          updated_at: string
          updated_by: string | null
          validity_months: number | null
          validity_type: string | null
          warn_below_quantity: number | null
        }
        Insert: {
          allowed_belt_levels?: string[] | null
          allowed_class_types?: string[] | null
          available_sizes?: string[] | null
          available_variants?: Json | null
          base_price?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_adhoc_lesson?: boolean | null
          is_lesson?: boolean | null
          is_recurring?: boolean | null
          is_service?: boolean
          kind?: string | null
          lesson_days?: string[] | null
          lessons_per_week?: number | null
          max_age?: number | null
          max_belt_level?: string | null
          metadata?: Json | null
          min_age?: number | null
          min_belt_level?: string | null
          name: string
          requires_belt_level?: boolean | null
          requires_belt_rank?: boolean | null
          requires_color?: boolean | null
          requires_size?: boolean | null
          session_count?: number | null
          sku: string
          tax_rate?: number | null
          term_id?: string | null
          updated_at?: string
          updated_by?: string | null
          validity_months?: number | null
          validity_type?: string | null
          warn_below_quantity?: number | null
        }
        Update: {
          allowed_belt_levels?: string[] | null
          allowed_class_types?: string[] | null
          available_sizes?: string[] | null
          available_variants?: Json | null
          base_price?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_adhoc_lesson?: boolean | null
          is_lesson?: boolean | null
          is_recurring?: boolean | null
          is_service?: boolean
          kind?: string | null
          lesson_days?: string[] | null
          lessons_per_week?: number | null
          max_age?: number | null
          max_belt_level?: string | null
          metadata?: Json | null
          min_age?: number | null
          min_belt_level?: string | null
          name?: string
          requires_belt_level?: boolean | null
          requires_belt_rank?: boolean | null
          requires_color?: boolean | null
          requires_size?: boolean | null
          session_count?: number | null
          sku?: string
          tax_rate?: number | null
          term_id?: string | null
          updated_at?: string
          updated_by?: string | null
          validity_months?: number | null
          validity_type?: string | null
          warn_below_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "term_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      public_chat_callback_requests: {
        Row: {
          branch_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_student_id: string | null
          current_belt: string | null
          date_of_birth: string | null
          email_sent_at: string | null
          first_name: string | null
          gender: string | null
          handled_booking_keys: string[]
          id: string
          last_name: string | null
          matched_student_id: string | null
          message: string | null
          name: string | null
          preferred_time: string | null
          rejected_at: string | null
          rejected_reason: string | null
          session_id: string | null
          status: string
          type: string
        }
        Insert: {
          branch_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_student_id?: string | null
          current_belt?: string | null
          date_of_birth?: string | null
          email_sent_at?: string | null
          first_name?: string | null
          gender?: string | null
          handled_booking_keys?: string[]
          id?: string
          last_name?: string | null
          matched_student_id?: string | null
          message?: string | null
          name?: string | null
          preferred_time?: string | null
          rejected_at?: string | null
          rejected_reason?: string | null
          session_id?: string | null
          status?: string
          type?: string
        }
        Update: {
          branch_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_student_id?: string | null
          current_belt?: string | null
          date_of_birth?: string | null
          email_sent_at?: string | null
          first_name?: string | null
          gender?: string | null
          handled_booking_keys?: string[]
          id?: string
          last_name?: string | null
          matched_student_id?: string | null
          message?: string | null
          name?: string | null
          preferred_time?: string | null
          rejected_at?: string | null
          rejected_reason?: string | null
          session_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_chat_callback_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "public_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      public_chat_events: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          session_id: string
          step: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          session_id: string
          step: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          session_id?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_chat_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "public_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      public_chat_payment_submissions: {
        Row: {
          amount: number | null
          branch_id: string | null
          category: string | null
          created_at: string
          id: string
          items: Json
          matched_invoice_id: string | null
          matched_student_id: string | null
          notes: string | null
          payment_method: string | null
          proof_url: string | null
          reference_number: string | null
          session_id: string | null
          status: string
        }
        Insert: {
          amount?: number | null
          branch_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          items?: Json
          matched_invoice_id?: string | null
          matched_student_id?: string | null
          notes?: string | null
          payment_method?: string | null
          proof_url?: string | null
          reference_number?: string | null
          session_id?: string | null
          status?: string
        }
        Update: {
          amount?: number | null
          branch_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          items?: Json
          matched_invoice_id?: string | null
          matched_student_id?: string | null
          notes?: string | null
          payment_method?: string | null
          proof_url?: string | null
          reference_number?: string | null
          session_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_chat_payment_submissions_matched_student_id_fkey"
            columns: ["matched_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_chat_payment_submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "public_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      public_chat_sessions: {
        Row: {
          branch_id: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          matched_student_id: string | null
          outcome: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          matched_student_id?: string | null
          outcome?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          matched_student_id?: string | null
          outcome?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_chat_sessions_matched_student_id_fkey"
            columns: ["matched_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      public_holidays: {
        Row: {
          country: string
          created_at: string | null
          date: string
          id: string
          is_monday_holiday: boolean
          name: string
          updated_at: string | null
          year: number
        }
        Insert: {
          country?: string
          created_at?: string | null
          date: string
          id?: string
          is_monday_holiday?: boolean
          name: string
          updated_at?: string | null
          year: number
        }
        Update: {
          country?: string
          created_at?: string | null
          date?: string
          id?: string
          is_monday_holiday?: boolean
          name?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      published_pl_reports: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          month: number
          notes: string | null
          published_at: string
          published_by: string | null
          year: number
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          published_at?: string
          published_by?: string | null
          year: number
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          published_at?: string
          published_by?: string | null
          year?: number
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string
        }
        Relationships: []
      }
      seminar_payment_submissions: {
        Row: {
          amount: number
          branch_id: string
          collected: boolean
          collected_at: string | null
          collected_by: string | null
          created_at: string
          current_belt: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          matched_invoice_id: string | null
          matched_student_id: string | null
          notes: string | null
          package_code: string
          package_label: string
          payment_method: string
          proof_url: string
          reference_number: string
          reviewed_at: string | null
          reviewed_by: string | null
          session_dates: string[]
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id: string
          collected?: boolean
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          current_belt?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          matched_invoice_id?: string | null
          matched_student_id?: string | null
          notes?: string | null
          package_code: string
          package_label: string
          payment_method: string
          proof_url: string
          reference_number?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_dates?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          collected?: boolean
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          current_belt?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          matched_invoice_id?: string | null
          matched_student_id?: string | null
          notes?: string | null
          package_code?: string
          package_label?: string
          payment_method?: string
          proof_url?: string
          reference_number?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_dates?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seminar_payment_submissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seminar_payment_submissions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seminar_payment_submissions_matched_student_id_fkey"
            columns: ["matched_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_booking_edit_requests: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          new_branch_id: string | null
          new_branch_name: string | null
          new_employee_id: string | null
          new_employee_name: string | null
          reason: string
          request_type: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          new_branch_id?: string | null
          new_branch_name?: string | null
          new_employee_id?: string | null
          new_employee_name?: string | null
          reason: string
          request_type: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          new_branch_id?: string | null
          new_branch_name?: string | null
          new_employee_id?: string | null
          new_employee_name?: string | null
          reason?: string
          request_type?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      slot_booking_pricing_config: {
        Row: {
          created_at: string
          created_by: string | null
          dan_first_bonus: number
          dan_second_bonus: number
          dan_third_above_bonus: number
          effective_from: string | null
          friday_end_time: string | null
          friday_start_time: string | null
          id: string
          is_active: boolean | null
          milestone_10_slots_bonus: number | null
          milestone_16_slots_bonus: number | null
          milestone_5_slots_bonus: number | null
          monday_end_time: string | null
          monday_start_time: string | null
          saturday_end_time: string | null
          saturday_start_time: string | null
          sg_coach_level1_bonus: number
          sg_coach_level2_bonus: number
          stf_coach_induction_bonus: number
          stf_kyorugi_referee_bonus: number
          stf_poomsae_coach_level1_bonus: number
          stf_poomsae_coach_level2_bonus: number
          stf_poomsae_coach_level3_bonus: number
          stf_poomsae_referee_bonus: number
          sunday_end_time: string | null
          sunday_start_time: string | null
          thursday_end_time: string | null
          thursday_start_time: string | null
          tuesday_end_time: string | null
          tuesday_start_time: string | null
          updated_at: string
          updated_by: string | null
          wednesday_end_time: string | null
          wednesday_start_time: string | null
          weekday_base_rate: number
          weekend_base_rate: number
          years_of_service_bonus_per_year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dan_first_bonus?: number
          dan_second_bonus?: number
          dan_third_above_bonus?: number
          effective_from?: string | null
          friday_end_time?: string | null
          friday_start_time?: string | null
          id?: string
          is_active?: boolean | null
          milestone_10_slots_bonus?: number | null
          milestone_16_slots_bonus?: number | null
          milestone_5_slots_bonus?: number | null
          monday_end_time?: string | null
          monday_start_time?: string | null
          saturday_end_time?: string | null
          saturday_start_time?: string | null
          sg_coach_level1_bonus?: number
          sg_coach_level2_bonus?: number
          stf_coach_induction_bonus?: number
          stf_kyorugi_referee_bonus?: number
          stf_poomsae_coach_level1_bonus?: number
          stf_poomsae_coach_level2_bonus?: number
          stf_poomsae_coach_level3_bonus?: number
          stf_poomsae_referee_bonus?: number
          sunday_end_time?: string | null
          sunday_start_time?: string | null
          thursday_end_time?: string | null
          thursday_start_time?: string | null
          tuesday_end_time?: string | null
          tuesday_start_time?: string | null
          updated_at?: string
          updated_by?: string | null
          wednesday_end_time?: string | null
          wednesday_start_time?: string | null
          weekday_base_rate?: number
          weekend_base_rate?: number
          years_of_service_bonus_per_year?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dan_first_bonus?: number
          dan_second_bonus?: number
          dan_third_above_bonus?: number
          effective_from?: string | null
          friday_end_time?: string | null
          friday_start_time?: string | null
          id?: string
          is_active?: boolean | null
          milestone_10_slots_bonus?: number | null
          milestone_16_slots_bonus?: number | null
          milestone_5_slots_bonus?: number | null
          monday_end_time?: string | null
          monday_start_time?: string | null
          saturday_end_time?: string | null
          saturday_start_time?: string | null
          sg_coach_level1_bonus?: number
          sg_coach_level2_bonus?: number
          stf_coach_induction_bonus?: number
          stf_kyorugi_referee_bonus?: number
          stf_poomsae_coach_level1_bonus?: number
          stf_poomsae_coach_level2_bonus?: number
          stf_poomsae_coach_level3_bonus?: number
          stf_poomsae_referee_bonus?: number
          sunday_end_time?: string | null
          sunday_start_time?: string | null
          thursday_end_time?: string | null
          thursday_start_time?: string | null
          tuesday_end_time?: string | null
          tuesday_start_time?: string | null
          updated_at?: string
          updated_by?: string | null
          wednesday_end_time?: string | null
          wednesday_start_time?: string | null
          weekday_base_rate?: number
          weekend_base_rate?: number
          years_of_service_bonus_per_year?: number
        }
        Relationships: []
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
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "active_employees"
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
      sm_ai_generations: {
        Row: {
          branch_name: string | null
          created_at: string
          created_by: string | null
          id: string
          mode: string | null
          model: string | null
          post_id: string | null
          prompt: Json | null
          response: Json | null
          tokens_used: number | null
        }
        Insert: {
          branch_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string | null
          model?: string | null
          post_id?: string | null
          prompt?: Json | null
          response?: Json | null
          tokens_used?: number | null
        }
        Update: {
          branch_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string | null
          model?: string | null
          post_id?: string | null
          prompt?: Json | null
          response?: Json | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sm_ai_generations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "sm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_brand_settings: {
        Row: {
          banned_words: string[] | null
          branch_name: string
          brand_keywords: string[] | null
          color_palette: Json | null
          created_at: string
          cta_style: string | null
          default_hashtags: string[] | null
          emoji_style: string | null
          id: string
          logo_url: string | null
          posting_frequency: string | null
          preferred_caption_length: string | null
          target_audience: string | null
          tone_of_voice: string | null
          updated_at: string
        }
        Insert: {
          banned_words?: string[] | null
          branch_name: string
          brand_keywords?: string[] | null
          color_palette?: Json | null
          created_at?: string
          cta_style?: string | null
          default_hashtags?: string[] | null
          emoji_style?: string | null
          id?: string
          logo_url?: string | null
          posting_frequency?: string | null
          preferred_caption_length?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string
        }
        Update: {
          banned_words?: string[] | null
          branch_name?: string
          brand_keywords?: string[] | null
          color_palette?: Json | null
          created_at?: string
          cta_style?: string | null
          default_hashtags?: string[] | null
          emoji_style?: string | null
          id?: string
          logo_url?: string | null
          posting_frequency?: string | null
          preferred_caption_length?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sm_caricatures: {
        Row: {
          branch_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string
          is_active: boolean
          name: string
          storage_path: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          branch_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          name: string
          storage_path: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          branch_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          name?: string
          storage_path?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      sm_media_assets: {
        Row: {
          branch_name: string
          content_kind: string
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          mime_type: string
          storage_path: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          branch_name: string
          content_kind: string
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          mime_type: string
          storage_path: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          branch_name?: string
          content_kind?: string
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          mime_type?: string
          storage_path?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      sm_post_assets: {
        Row: {
          asset_id: string
          position: number
          post_id: string
        }
        Insert: {
          asset_id: string
          position?: number
          post_id: string
        }
        Update: {
          asset_id?: string
          position?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sm_post_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "sm_media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_post_assets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "sm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_post_metrics: {
        Row: {
          comments: number | null
          created_at: string
          id: string
          likes: number | null
          notes: string | null
          platform: string
          post_id: string
          recorded_at: string
          recorded_by: string | null
          saves: number | null
          shares: number | null
          updated_at: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string
          id?: string
          likes?: number | null
          notes?: string | null
          platform: string
          post_id: string
          recorded_at?: string
          recorded_by?: string | null
          saves?: number | null
          shares?: number | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string
          id?: string
          likes?: number | null
          notes?: string | null
          platform?: string
          post_id?: string
          recorded_at?: string
          recorded_by?: string | null
          saves?: number | null
          shares?: number | null
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sm_post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "sm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_posts: {
        Row: {
          approved_by: string | null
          branch_name: string
          caption: string | null
          content_type: string
          created_at: string
          created_by: string | null
          cta: string | null
          event_name: string | null
          failure_reason: string | null
          hashtags: string[] | null
          id: string
          ig_account_id: string | null
          ig_media_id: string | null
          instructor_name: string | null
          notes_for_ai: string | null
          overlay_text: string | null
          platform_captions: Json
          posted_platforms: Json
          published_at: string | null
          reel_title: string | null
          scheduled_for: string | null
          status: string
          student_name: string | null
          tags: string[] | null
          target_platforms: string[]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          branch_name: string
          caption?: string | null
          content_type: string
          created_at?: string
          created_by?: string | null
          cta?: string | null
          event_name?: string | null
          failure_reason?: string | null
          hashtags?: string[] | null
          id?: string
          ig_account_id?: string | null
          ig_media_id?: string | null
          instructor_name?: string | null
          notes_for_ai?: string | null
          overlay_text?: string | null
          platform_captions?: Json
          posted_platforms?: Json
          published_at?: string | null
          reel_title?: string | null
          scheduled_for?: string | null
          status?: string
          student_name?: string | null
          tags?: string[] | null
          target_platforms?: string[]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          branch_name?: string
          caption?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          cta?: string | null
          event_name?: string | null
          failure_reason?: string | null
          hashtags?: string[] | null
          id?: string
          ig_account_id?: string | null
          ig_media_id?: string | null
          instructor_name?: string | null
          notes_for_ai?: string | null
          overlay_text?: string | null
          platform_captions?: Json
          posted_platforms?: Json
          published_at?: string | null
          reel_title?: string | null
          scheduled_for?: string | null
          status?: string
          student_name?: string | null
          tags?: string[] | null
          target_platforms?: string[]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sm_prompt_presets: {
        Row: {
          branch_name: string
          created_at: string
          id: string
          name: string
          prompt: string
          updated_at: string
        }
        Insert: {
          branch_name: string
          created_at?: string
          id?: string
          name: string
          prompt: string
          updated_at?: string
        }
        Update: {
          branch_name?: string
          created_at?: string
          id?: string
          name?: string
          prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      sm_publish_logs: {
        Row: {
          attempted_at: string
          error_message: string | null
          id: string
          ig_response: Json | null
          post_id: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          error_message?: string | null
          id?: string
          ig_response?: Json | null
          post_id?: string | null
          success: boolean
        }
        Update: {
          attempted_at?: string
          error_message?: string | null
          id?: string
          ig_response?: Json | null
          post_id?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sm_publish_logs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "sm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_campaigns: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          failed_count: number
          filters_json: Json
          id: string
          name: string
          scheduled_at: string
          sent_count: number
          status: string
          total_count: number
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          filters_json?: Json
          id?: string
          name: string
          scheduled_at?: string
          sent_count?: number
          status?: string
          total_count?: number
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          filters_json?: Json
          id?: string
          name?: string
          scheduled_at?: string
          sent_count?: number
          status?: string
          total_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      sms_device_branches: {
        Row: {
          branch_id: string
          created_at: string
          device_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          device_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          device_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_device_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_device_branches_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "sms_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_devices: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          label: string
          last_seen_at: string | null
          poll_interval_seconds: number
          send_delay_ms: number
          token_hash: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          last_seen_at?: string | null
          poll_interval_seconds?: number
          send_delay_ms?: number
          token_hash: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          last_seen_at?: string | null
          poll_interval_seconds?: number
          send_delay_ms?: number
          token_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          body: string
          created_at: string
          direction: string
          id: string
          outbound_id: string | null
          phone: string
          sent_at: string
          status: string | null
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          direction: string
          id?: string
          outbound_id?: string | null
          phone: string
          sent_at?: string
          status?: string | null
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          direction?: string
          id?: string
          outbound_id?: string | null
          phone?: string
          sent_at?: string
          status?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_outbound_id_fkey"
            columns: ["outbound_id"]
            isOneToOne: false
            referencedRelation: "sms_outbound"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "sms_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_outbound: {
        Row: {
          body: string
          branch_id: string | null
          campaign_id: string | null
          created_at: string
          device_id: string | null
          device_message_id: string | null
          error: string | null
          id: string
          phone: string
          send_at: string
          sent_at: string | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          body: string
          branch_id?: string | null
          campaign_id?: string | null
          created_at?: string
          device_id?: string | null
          device_message_id?: string | null
          error?: string | null
          id?: string
          phone: string
          send_at?: string
          sent_at?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          branch_id?: string | null
          campaign_id?: string | null
          created_at?: string
          device_id?: string | null
          device_message_id?: string | null
          error?: string | null
          id?: string
          phone?: string
          send_at?: string
          sent_at?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_outbound_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_outbound_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sms_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_outbound_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "sms_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_outbound_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_threads: {
        Row: {
          created_at: string
          id: string
          last_direction: string | null
          last_message_at: string
          last_snippet: string | null
          phone: string
          student_id: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_direction?: string | null
          last_message_at?: string
          last_snippet?: string | null
          phone: string
          student_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_direction?: string | null
          last_message_at?: string
          last_snippet?: string | null
          phone?: string
          student_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_threads_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string
          caption: string | null
          content_type: string
          created_at: string
          created_by: string | null
          cta: string | null
          failure_reason: string | null
          hashtags: string[] | null
          id: string
          instagram_media_id: string | null
          instagram_permalink: string | null
          media_type: string | null
          media_url: string | null
          published_at: string | null
          rejection_note: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id: string
          caption?: string | null
          content_type: string
          created_at?: string
          created_by?: string | null
          cta?: string | null
          failure_reason?: string | null
          hashtags?: string[] | null
          id?: string
          instagram_media_id?: string | null
          instagram_permalink?: string | null
          media_type?: string | null
          media_url?: string | null
          published_at?: string | null
          rejection_note?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string
          caption?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          cta?: string | null
          failure_reason?: string | null
          hashtags?: string[] | null
          id?: string
          instagram_media_id?: string | null
          instagram_permalink?: string | null
          media_type?: string | null
          media_url?: string | null
          published_at?: string | null
          rejection_note?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      student_auth: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string
          id: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_auth_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_branch_chats: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          sender_id: string
          sender_name: string
          sender_type: string
          student_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          sender_id: string
          sender_name: string
          sender_type: string
          student_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          sender_id?: string
          sender_name?: string
          sender_type?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_branch_chats_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_branch_chats_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_change_logs: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_email: string | null
          changes: Json | null
          created_at: string
          field_name: string | null
          id: string
          ip_address: string | null
          new_value: string | null
          old_value: string | null
          student_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_email?: string | null
          changes?: Json | null
          created_at?: string
          field_name?: string | null
          id?: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
          student_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_email?: string | null
          changes?: Json | null
          created_at?: string
          field_name?: string | null
          id?: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_change_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_class_enrollments: {
        Row: {
          branch_id: string
          class_type: string
          created_at: string
          created_by: string | null
          enrolled_weekdays: number[] | null
          id: string
          invoice_item_id: string | null
          notes: string | null
          pricing_tier_id: string | null
          status: string
          student_id: string
          term_id: string
          tier_name: string
          total_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id: string
          class_type: string
          created_at?: string
          created_by?: string | null
          enrolled_weekdays?: number[] | null
          id?: string
          invoice_item_id?: string | null
          notes?: string | null
          pricing_tier_id?: string | null
          status?: string
          student_id: string
          term_id: string
          tier_name: string
          total_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string
          class_type?: string
          created_at?: string
          created_by?: string | null
          enrolled_weekdays?: number[] | null
          id?: string
          invoice_item_id?: string | null
          notes?: string | null
          pricing_tier_id?: string | null
          status?: string
          student_id?: string
          term_id?: string
          tier_name?: string
          total_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_class_enrollments_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_enrollments_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "class_pricing_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_enrollments_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "term_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      student_credits: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string
          id: string
          reference_id: string | null
          student_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          reference_id?: string | null
          student_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          reference_id?: string | null
          student_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_credits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_emergency_contacts: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string
          relationship: string
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone: string
          relationship: string
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string
          relationship?: string
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_emergency_contacts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_grading_history: {
        Row: {
          belt_from: string | null
          belt_to: string
          branch_id: string | null
          certificate_issued: boolean | null
          created_at: string
          created_by: string | null
          examiner_name: string | null
          grading_date: string
          id: string
          notes: string | null
          result: string | null
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          belt_from?: string | null
          belt_to: string
          branch_id?: string | null
          certificate_issued?: boolean | null
          created_at?: string
          created_by?: string | null
          examiner_name?: string | null
          grading_date: string
          id?: string
          notes?: string | null
          result?: string | null
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          belt_from?: string | null
          belt_to?: string
          branch_id?: string | null
          certificate_issued?: boolean | null
          created_at?: string
          created_by?: string | null
          examiner_name?: string | null
          grading_date?: string
          id?: string
          notes?: string | null
          result?: string | null
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_grading_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_medical_notes: {
        Row: {
          allergies: string | null
          created_at: string
          created_by: string | null
          dietary_restrictions: string | null
          id: string
          last_updated_at: string | null
          medical_condition: string | null
          medications: string | null
          other_notes: string | null
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allergies?: string | null
          created_at?: string
          created_by?: string | null
          dietary_restrictions?: string | null
          id?: string
          last_updated_at?: string | null
          medical_condition?: string | null
          medications?: string | null
          other_notes?: string | null
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allergies?: string | null
          created_at?: string
          created_by?: string | null
          dietary_restrictions?: string | null
          id?: string
          last_updated_at?: string | null
          medical_condition?: string | null
          medications?: string | null
          other_notes?: string | null
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_medical_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notification_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          student_id: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          student_id: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          student_id?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_notification_subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_registrations: {
        Row: {
          address: string | null
          branch_id: string | null
          certificate_name: string | null
          created_at: string
          current_belt: string | null
          date_of_birth: string | null
          dietary_restrictions: string | null
          display_name: string | null
          email: string | null
          emergency_contact_2_name: string | null
          emergency_contact_2_phone: string | null
          emergency_contact_2_relationship: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          gender: string | null
          id: string
          languages_spoken: Json | null
          last_name: string
          medical_conditions: string | null
          nationality: Json | null
          notes: string | null
          nric_passport: string | null
          passport_no: string | null
          phone: string | null
          postal_code: string | null
          preferred_name: string | null
          previous_experience: string | null
          referral_source: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          signature_url: string | null
          status: string
          training_goals: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          certificate_name?: string | null
          created_at?: string
          current_belt?: string | null
          date_of_birth?: string | null
          dietary_restrictions?: string | null
          display_name?: string | null
          email?: string | null
          emergency_contact_2_name?: string | null
          emergency_contact_2_phone?: string | null
          emergency_contact_2_relationship?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          gender?: string | null
          id?: string
          languages_spoken?: Json | null
          last_name: string
          medical_conditions?: string | null
          nationality?: Json | null
          notes?: string | null
          nric_passport?: string | null
          passport_no?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_name?: string | null
          previous_experience?: string | null
          referral_source?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_url?: string | null
          status?: string
          training_goals?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          certificate_name?: string | null
          created_at?: string
          current_belt?: string | null
          date_of_birth?: string | null
          dietary_restrictions?: string | null
          display_name?: string | null
          email?: string | null
          emergency_contact_2_name?: string | null
          emergency_contact_2_phone?: string | null
          emergency_contact_2_relationship?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          languages_spoken?: Json | null
          last_name?: string
          medical_conditions?: string | null
          nationality?: Json | null
          notes?: string | null
          nric_passport?: string | null
          passport_no?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_name?: string | null
          previous_experience?: string | null
          referral_source?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_url?: string | null
          status?: string
          training_goals?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_registrations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      student_scheduled_classes: {
        Row: {
          attended_at: string | null
          created_at: string
          end_time: string
          enrollment_id: string
          id: string
          notes: string | null
          recorded_by: string | null
          scheduled_date: string
          start_time: string
          status: string
          swap_reason: string | null
          swapped_from_id: string | null
          timetable_id: string | null
          updated_at: string
        }
        Insert: {
          attended_at?: string | null
          created_at?: string
          end_time: string
          enrollment_id: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          scheduled_date: string
          start_time: string
          status?: string
          swap_reason?: string | null
          swapped_from_id?: string | null
          timetable_id?: string | null
          updated_at?: string
        }
        Update: {
          attended_at?: string | null
          created_at?: string
          end_time?: string
          enrollment_id?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          scheduled_date?: string
          start_time?: string
          status?: string
          swap_reason?: string | null
          swapped_from_id?: string | null
          timetable_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_scheduled_classes_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "student_class_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_scheduled_classes_swapped_from_id_fkey"
            columns: ["swapped_from_id"]
            isOneToOne: false
            referencedRelation: "student_scheduled_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_scheduled_classes_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "branch_timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      student_update_requests: {
        Row: {
          created_at: string | null
          id: string
          requested_at: string | null
          requested_changes: Json
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          requested_at?: string | null
          requested_changes: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          requested_at?: string | null
          requested_changes?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_update_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_update_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_update_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_withdrawal_requests: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          requested_at: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          student_name: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          requested_at?: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          student_name: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          requested_at?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          student_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_withdrawal_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          allowed_class_types: string[] | null
          branch_id: string | null
          certificate_name: string | null
          created_at: string
          created_by: string | null
          current_belt: string | null
          date_of_birth: string | null
          dietary_restrictions: string | null
          display_name: string | null
          email: string | null
          emergency_contact_2_name: string | null
          emergency_contact_2_phone: string | null
          emergency_contact_2_relationship: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          enrollment_date: string | null
          first_name: string
          gender: string | null
          id: string
          languages_spoken: string[] | null
          last_name: string | null
          medical_conditions: string | null
          nationality: string[] | null
          notes: string | null
          nric_passport: string | null
          passport_no: string | null
          passport_photo_url: string | null
          phone: string | null
          postal_code: string | null
          preferred_name: string | null
          previous_experience: string | null
          referral_source: string | null
          registered_date: string | null
          status: string | null
          student_number: string
          training_goals: string | null
          trial_date: string | null
          trial_time: string | null
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          allowed_class_types?: string[] | null
          branch_id?: string | null
          certificate_name?: string | null
          created_at?: string
          created_by?: string | null
          current_belt?: string | null
          date_of_birth?: string | null
          dietary_restrictions?: string | null
          display_name?: string | null
          email?: string | null
          emergency_contact_2_name?: string | null
          emergency_contact_2_phone?: string | null
          emergency_contact_2_relationship?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          enrollment_date?: string | null
          first_name: string
          gender?: string | null
          id?: string
          languages_spoken?: string[] | null
          last_name?: string | null
          medical_conditions?: string | null
          nationality?: string[] | null
          notes?: string | null
          nric_passport?: string | null
          passport_no?: string | null
          passport_photo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_name?: string | null
          previous_experience?: string | null
          referral_source?: string | null
          registered_date?: string | null
          status?: string | null
          student_number: string
          training_goals?: string | null
          trial_date?: string | null
          trial_time?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          allowed_class_types?: string[] | null
          branch_id?: string | null
          certificate_name?: string | null
          created_at?: string
          created_by?: string | null
          current_belt?: string | null
          date_of_birth?: string | null
          dietary_restrictions?: string | null
          display_name?: string | null
          email?: string | null
          emergency_contact_2_name?: string | null
          emergency_contact_2_phone?: string | null
          emergency_contact_2_relationship?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          enrollment_date?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          languages_spoken?: string[] | null
          last_name?: string | null
          medical_conditions?: string | null
          nationality?: string[] | null
          notes?: string | null
          nric_passport?: string | null
          passport_no?: string | null
          passport_photo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_name?: string | null
          previous_experience?: string | null
          referral_source?: string | null
          registered_date?: string | null
          status?: string | null
          student_number?: string
          training_goals?: string | null
          trial_date?: string | null
          trial_time?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      superadmin_users: {
        Row: {
          created_at: string | null
          created_by: string
          employee_email: string
          employee_name: string
          id: string
          is_active: boolean | null
          notes: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          employee_email: string
          employee_name: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          employee_email?: string
          employee_name?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
        }
        Relationships: []
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
      system_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tax_codes: {
        Row: {
          code: string
          country: string
          created_at: string
          direction: string
          id: string
          is_active: boolean
          name: string
          rate: number
          report_box: string | null
          updated_at: string
        }
        Insert: {
          code: string
          country: string
          created_at?: string
          direction?: string
          id?: string
          is_active?: boolean
          name: string
          rate?: number
          report_box?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          country?: string
          created_at?: string
          direction?: string
          id?: string
          is_active?: boolean
          name?: string
          rate?: number
          report_box?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tax_returns: {
        Row: {
          branch_id: string
          country: string
          created_at: string
          created_by: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          pdf_path: string | null
          period_from: string
          period_to: string
          status: string
          totals: Json
          updated_at: string
        }
        Insert: {
          branch_id: string
          country: string
          created_at?: string
          created_by?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          pdf_path?: string | null
          period_from: string
          period_to: string
          status?: string
          totals?: Json
          updated_at?: string
        }
        Update: {
          branch_id?: string
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          pdf_path?: string | null
          period_from?: string
          period_to?: string
          status?: string
          totals?: Json
          updated_at?: string
        }
        Relationships: []
      }
      term_breaks: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          term_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          term_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          term_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "term_breaks_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "term_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      term_calendars: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          grace_days: number | null
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          term_number: number | null
          total_weeks: number | null
          updated_at: string
          updated_by: string | null
          year: number | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          grace_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          term_number?: number | null
          total_weeks?: number | null
          updated_at?: string
          updated_by?: string | null
          year?: number | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          grace_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          term_number?: number | null
          total_weeks?: number | null
          updated_at?: string
          updated_by?: string | null
          year?: number | null
        }
        Relationships: []
      }
      user_passwords: {
        Row: {
          created_at: string
          email: string
          failed_attempts: number | null
          id: string
          last_password_change: string | null
          locked_until: string | null
          must_change_password: boolean | null
          password_complexity_met: boolean | null
          password_hash: string
          requires_change: boolean | null
          salt: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          failed_attempts?: number | null
          id?: string
          last_password_change?: string | null
          locked_until?: string | null
          must_change_password?: boolean | null
          password_complexity_met?: boolean | null
          password_hash: string
          requires_change?: boolean | null
          salt?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          failed_attempts?: number | null
          id?: string
          last_password_change?: string | null
          locked_until?: string | null
          must_change_password?: boolean | null
          password_complexity_met?: boolean | null
          password_hash?: string
          requires_change?: boolean | null
          salt?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_id: string | null
          email: string
          expires_at: string
          id: string
          last_activity: string | null
          logout_reason: string | null
          session_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          email: string
          expires_at: string
          id?: string
          last_activity?: string | null
          logout_reason?: string | null
          session_data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          last_activity?: string | null
          logout_reason?: string | null
          session_data?: Json
          updated_at?: string
          user_id?: string
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
      active_employees: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          base_salary: number | null
          created_at: string | null
          date_of_birth: string | null
          department: string | null
          display_name: string | null
          email: string | null
          hourly_rate: number | null
          id: string | null
          join_date: string | null
          name: string | null
          nric: string | null
          payment_type: string | null
          phone: string | null
          position: string | null
          qualifications: Json | null
          residency_status: string | null
          resign_date: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          display_name?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string | null
          join_date?: string | null
          name?: string | null
          nric?: string | null
          payment_type?: string | null
          phone?: string | null
          position?: string | null
          qualifications?: Json | null
          residency_status?: string | null
          resign_date?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          display_name?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string | null
          join_date?: string | null
          name?: string | null
          nric?: string | null
          payment_type?: string | null
          phone?: string | null
          position?: string | null
          qualifications?: Json | null
          residency_status?: string | null
          resign_date?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_ledger_lines: {
        Row: {
          account_code: string | null
          account_country: string | null
          account_id: string | null
          account_name: string | null
          account_subtype: string | null
          account_type: string | null
          contact_ref: string | null
          contact_type: string | null
          credit: number | null
          debit: number | null
          entry_branch_id: string | null
          entry_country: string | null
          entry_date: string | null
          entry_id: string | null
          entry_number: string | null
          entry_status: string | null
          journal_id: string | null
          line_branch_id: string | null
          line_description: string | null
          line_id: string | null
          line_no: number | null
          narration: string | null
          period: string | null
          posted_at: string | null
          reference: string | null
          source_id: string | null
          source_type: string | null
          tax_amount: number | null
          tax_base_amount: number | null
          tax_code_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "v_ledger_lines"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "v_pnl_lines"
            referencedColumns: ["journal_id"]
          },
          {
            foreignKeyName: "journal_lines_tax_code_id_fkey"
            columns: ["tax_code_id"]
            isOneToOne: false
            referencedRelation: "tax_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pnl_lines: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_sort_order: number | null
          account_subtype: string | null
          account_type: string | null
          branch_id: string | null
          country: string | null
          credit: number | null
          debit: number | null
          entry_date: string | null
          journal_id: string | null
          line_id: string | null
          period: string | null
          signed_amount: number | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _next_invoice_number: { Args: never; Returns: string }
      _resolve_public_student_term: {
        Args: { p_student_id: string }
        Returns: {
          class_type: string
          end_date: string
          enrollment_id: string
          start_date: string
          term_id: string
          term_name: string
        }[]
      }
      _validate_public_chat_session: {
        Args: {
          p_branch_id?: string
          p_session_id: string
          p_student_id: string
        }
        Returns: boolean
      }
      add_password_to_history: {
        Args: { p_email: string; p_hash: string; p_salt: string }
        Returns: undefined
      }
      admin_append_competition_grading_cards: {
        Args: { p_id: string; p_new_urls: string[] }
        Returns: string[]
      }
      admin_competition_submission_delete_context: {
        Args: { p_id: string }
        Returns: {
          invoice_number: string
          student_matched: boolean
          student_name: string
        }[]
      }
      admin_create_seminar_invoice: {
        Args: { p_id: string; p_verified_by: string }
        Returns: string
      }
      admin_delete_competition_event: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_delete_competition_extra_line_preset: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_delete_competition_submission: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_delete_grading_registration: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_delete_grading_submission: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_delete_guards_purchase: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_delete_seminar_submission: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_grading_row_delete_context: {
        Args: { p_id: string; p_source: string }
        Returns: {
          invoice_number: string
          student_matched: boolean
          student_name: string
        }[]
      }
      admin_guards_purchase_delete_context: {
        Args: { p_id: string }
        Returns: {
          invoice_number: string
          student_matched: boolean
          student_name: string
        }[]
      }
      admin_import_competition_submission: {
        Args: { p_id: string; p_verified_by: string }
        Returns: string
      }
      admin_import_grading_submission: {
        Args: { p_id: string; p_verified_by: string }
        Returns: string
      }
      admin_import_seminar_submission_student: {
        Args: { p_created_by: string; p_id: string }
        Returns: string
      }
      admin_list_competition_extra_line_presets: {
        Args: never
        Returns: {
          created_at: string
          default_amount: number
          display_order: number
          id: string
          is_active: boolean
          name: string
          requires_weight: boolean
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "competition_extra_line_presets"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_mark_seminar_collected: {
        Args: { p_by: string; p_collected: boolean; p_id: string }
        Returns: undefined
      }
      admin_match_competition_submission: {
        Args: { p_id: string; p_student_id: string }
        Returns: undefined
      }
      admin_match_grading_submission: {
        Args: { p_id: string; p_student_id: string }
        Returns: undefined
      }
      admin_match_seminar_submission: {
        Args: { p_id: string; p_student_id: string }
        Returns: undefined
      }
      admin_reject_accessory_submission: {
        Args: { p_id: string; p_reason: string; p_reviewed_by: string }
        Returns: undefined
      }
      admin_reject_competition_submission: {
        Args: { p_id: string; p_reason: string; p_reviewed_by: string }
        Returns: undefined
      }
      admin_reject_grading_submission: {
        Args: { p_id: string; p_reason: string; p_reviewed_by: string }
        Returns: undefined
      }
      admin_reject_seminar_submission: {
        Args: { p_id: string; p_reason: string; p_reviewed_by: string }
        Returns: undefined
      }
      admin_replace_competition_grading_card_at: {
        Args: { p_id: string; p_index: number; p_new_url: string }
        Returns: string[]
      }
      admin_reset_password: {
        Args: {
          new_password_hash: string
          new_salt: string
          target_email: string
        }
        Returns: undefined
      }
      admin_seminar_submission_delete_context: {
        Args: { p_id: string }
        Returns: {
          invoice_number: string
          package_label: string
          student_name: string
        }[]
      }
      admin_set_competition_event_active: {
        Args: { p_active: boolean; p_id: string }
        Returns: undefined
      }
      admin_set_competition_grading_cards: {
        Args: { p_id: string; p_urls: string[] }
        Returns: undefined
      }
      admin_update_competition_poomsae: {
        Args: { p_id: string; p_poomsae_1: string; p_poomsae_2: string }
        Returns: undefined
      }
      admin_update_competition_submission_categories: {
        Args: { p_category_ids: string[]; p_id: string }
        Returns: undefined
      }
      admin_update_grading_registration_branch: {
        Args: { p_branch_id: string; p_registration_id: string }
        Returns: undefined
      }
      admin_update_grading_registration_display_name: {
        Args: { p_display_name: string; p_registration_id: string }
        Returns: undefined
      }
      admin_update_grading_registration_slot: {
        Args: { p_registration_id: string; p_slot_id: string }
        Returns: undefined
      }
      admin_update_grading_remark: {
        Args: { p_registration_id: string; p_remark: string }
        Returns: undefined
      }
      admin_update_grading_result: {
        Args: { p_registration_id: string; p_result: string }
        Returns: undefined
      }
      admin_update_grading_submission_branch: {
        Args: { p_branch_id: string; p_submission_id: string }
        Returns: undefined
      }
      admin_update_grading_submission_display_name: {
        Args: { p_display_name: string; p_submission_id: string }
        Returns: undefined
      }
      admin_update_grading_submission_remark: {
        Args: { p_remark: string; p_submission_id: string }
        Returns: undefined
      }
      admin_update_grading_submission_result: {
        Args: { p_result: string; p_submission_id: string }
        Returns: undefined
      }
      admin_update_grading_submission_slot: {
        Args: { p_id: string; p_slot_id: string }
        Returns: undefined
      }
      admin_update_student_certificate_name: {
        Args: { p_certificate_name: string; p_student_id: string }
        Returns: undefined
      }
      admin_upsert_competition_event:
        | {
            Args: {
              p_coaching_amount: number
              p_coaching_label: string
              p_coaching_required?: boolean
              p_display_order: number
              p_extra_lines: Json
              p_id: string
              p_indemnity_clause: string
              p_indemnity_template_name?: string
              p_indemnity_template_url?: string
              p_is_active: boolean
              p_name: string
              p_require_indemnity_form: boolean
              p_require_passport: boolean
              p_require_photo: boolean
            }
            Returns: string
          }
        | {
            Args: {
              p_coaching_amount: number
              p_coaching_label: string
              p_coaching_required?: boolean
              p_display_order: number
              p_extra_lines: Json
              p_id: string
              p_indemnity_clause: string
              p_indemnity_template_name?: string
              p_indemnity_template_url?: string
              p_is_active: boolean
              p_name: string
              p_require_grading_card?: boolean
              p_require_indemnity_form: boolean
              p_require_passport: boolean
              p_require_photo: boolean
            }
            Returns: string
          }
      admin_upsert_competition_extra_line_preset: {
        Args: {
          p_default_amount: number
          p_display_order: number
          p_id: string
          p_is_active: boolean
          p_name: string
          p_requires_weight: boolean
        }
        Returns: string
      }
      admin_verify_accessory_submission: {
        Args: { p_id: string; p_verified_by: string }
        Returns: Json
      }
      admin_verify_competition_submission: {
        Args: { p_id: string; p_verified_by: string }
        Returns: undefined
      }
      admin_verify_grading_submission: {
        Args: { p_id: string; p_verified_by: string }
        Returns: undefined
      }
      admin_verify_seminar_submission: {
        Args: { p_id: string; p_verified_by: string }
        Returns: undefined
      }
      calculate_annual_leave_entitlement: {
        Args: { employee_id: string; reference_year?: number }
        Returns: {
          base_annual_leave: number
          final_annual_leave: number
          medical_leave: number
          monday_holiday_bonus: number
          service_bonus_days: number
          total_annual_leave: number
          years_of_service: number
        }[]
      }
      calculate_unused_leave_for_encashment: {
        Args: { employee_id: string; reference_year?: number }
        Returns: {
          total_entitlement: number
          total_used: number
          unused_annual_leave: number
        }[]
      }
      calculate_years_of_service: {
        Args: { join_date: string; reference_date?: string }
        Returns: number
      }
      can_subscribe_topic: { Args: { _topic: string }; Returns: boolean }
      check_employee_admin_access: { Args: never; Returns: boolean }
      check_password_history: {
        Args: { p_email: string; p_new_hash: string }
        Returns: boolean
      }
      find_competition_submission_student_matches: {
        Args: { p_id: string }
        Returns: {
          branch_id: string
          current_belt: string
          date_of_birth: string
          email: string
          full_name: string
          reason: string
          score: number
          student_id: string
          student_number: string
        }[]
      }
      find_duplicate_students: {
        Args: { p_criteria?: Json }
        Returns: {
          group_key: string
          last_activity_at: string
          match_reason: string
          student_id: string
        }[]
      }
      find_grading_submission_student_matches: {
        Args: { p_id: string }
        Returns: {
          branch_id: string
          current_belt: string
          date_of_birth: string
          email: string
          full_name: string
          reason: string
          score: number
          student_id: string
          student_number: string
        }[]
      }
      find_seminar_submission_student_matches: {
        Args: { p_id: string }
        Returns: {
          branch_id: string
          current_belt: string
          date_of_birth: string
          email: string
          full_name: string
          reason: string
          score: number
          student_id: string
          student_number: string
        }[]
      }
      force_book_eldon_slots: { Args: never; Returns: Json }
      force_book_ryan_slots: { Args: never; Returns: Json }
      generate_chat_payment_reference: { Args: never; Returns: string }
      generate_grading_payment_reference: { Args: never; Returns: string }
      generate_payment_number: { Args: never; Returns: string }
      generate_student_number: { Args: never; Returns: string }
      get_admin_access_for_auth: {
        Args: { p_employee_id: string }
        Returns: {
          attendance: boolean
          claims: boolean
          employees: boolean
          leave_management: boolean
          payroll: boolean
          reports: boolean
          slot_booking: boolean
          slotBooking: boolean
        }[]
      }
      get_current_employee_id: { Args: never; Returns: string }
      get_current_student_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_eligible_employees_with_entitlements: {
        Args: { reference_year?: number }
        Returns: {
          base_annual_leave: number
          email: string
          employee_id: string
          employee_name: string
          employee_position: string
          employee_type: string
          final_annual_leave: number
          join_date: string
          medical_leave: number
          monday_holiday_bonus: number
          service_bonus_days: number
          total_annual_leave: number
          years_of_service: number
        }[]
      }
      get_employee_by_email_for_auth: {
        Args: { p_email: string }
        Returns: {
          address: string
          bank_account: string
          bank_name: string
          base_salary: number
          date_of_birth: string
          department: string
          display_name: string
          email: string
          first_name: string
          hourly_rate: number
          id: string
          join_date: string
          last_name: string
          name: string
          nric: string
          payment_type: string
          phone: string
          position: string
          qualifications: Json
          residency_status: string
          resign_date: string
          security_pin: string
          type: string
        }[]
      }
      get_linked_students_for_auth: {
        Args: { p_email: string }
        Returns: {
          current_belt: string
          student_email: string
          student_id: string
          student_name: string
          student_number: string
        }[]
      }
      get_page_access_for_auth: {
        Args: { p_employee_id: string }
        Returns: {
          apply_leave: boolean
          cctv_monitoring: boolean
          my_attendance: boolean
          payslips: boolean
          profile: boolean
          slot_booking_employee: boolean
          social_media: boolean
          submit_claim: boolean
        }[]
      }
      get_public_accessory_list: {
        Args: never
        Returns: {
          amount: number
          branch_id: string
          branch_name: string
          created_at: string
          display_name: string
          first_name: string
          id: string
          items: Json
          last_name: string
          matched_invoice_id: string
          matched_student_id: string
          payment_method: string
          proof_url: string
          reference_number: string
          status: string
        }[]
      }
      get_public_accessory_products: {
        Args: { p_branch_id: string }
        Returns: {
          base_price: number
          branch_price: number
          product_id: string
          product_name: string
        }[]
      }
      get_public_branch_holidays: {
        Args: {
          p_from: string
          p_session_id: string
          p_student_id: string
          p_to: string
        }
        Returns: {
          holiday_date: string
          name: string
        }[]
      }
      get_public_branch_timetable_slots: {
        Args: { p_session_id: string; p_student_id: string }
        Returns: {
          class_type: string
          end_time: string
          id: string
          max_capacity: number
          start_time: string
          weekday: number
        }[]
      }
      get_public_branches: {
        Args: never
        Returns: {
          country: string
          id: string
          name: string
        }[]
      }
      get_public_chat_products: {
        Args: { p_branch_id: string; p_category_id: string }
        Returns: {
          available_sizes: string[]
          available_variants: Json
          base_price: number
          branch_price: number
          product_id: string
          product_name: string
          requires_size: boolean
        }[]
      }
      get_public_chat_products_for_student: {
        Args: {
          p_branch_id: string
          p_category_id: string
          p_session_id: string
          p_student_id: string
        }
        Returns: {
          available_sizes: string[]
          available_variants: Json
          base_price: number
          branch_price: number
          is_term_based: boolean
          metadata: Json
          product_id: string
          product_name: string
          requires_size: boolean
        }[]
      }
      get_public_chat_terms_for_student: {
        Args: {
          p_branch_id: string
          p_session_id: string
          p_student_id: string
        }
        Returns: {
          end_date: string
          is_paid: boolean
          start_date: string
          term_id: string
          term_name: string
          total_weeks: number
        }[]
      }
      get_public_competition_events: {
        Args: never
        Returns: {
          coaching_amount: number
          coaching_label: string
          coaching_required: boolean
          display_order: number
          extra_lines: Json
          id: string
          indemnity_clause: string
          indemnity_template_name: string
          indemnity_template_url: string
          is_active: boolean
          name: string
          require_grading_card: boolean
          require_indemnity_form: boolean
          require_passport: boolean
          require_photo: boolean
        }[]
      }
      get_public_competition_extra_line_presets: {
        Args: never
        Returns: {
          default_amount: number
          display_order: number
          id: string
          is_active: boolean
          name: string
          requires_weight: boolean
        }[]
      }
      get_public_competition_list: {
        Args: { p_branch_id?: string }
        Returns: {
          amount: number
          branch_id: string
          branch_name: string
          category_count: number
          category_names: string[]
          certificate_url: string
          coaching_paid: boolean
          competition_at: string
          court: string
          created_at: string
          current_belt: string
          date_of_birth: string
          event_id: string
          event_name: string
          extra_categories: string[]
          gender: string
          grading_card_urls: string[]
          indemnity_form_url: string
          paid_status: string
          passport_url: string
          photo_url: string
          poomsae_1: string
          poomsae_2: string
          proof_url: string
          reference_number: string
          reporting_at: string
          require_grading_card: boolean
          signature_url: string
          status: string
          student_name: string
          submission_id: string
        }[]
      }
      get_public_competition_products: {
        Args: never
        Returns: {
          base_price: number
          id: string
          kind: string
          name: string
          tax_rate: number
        }[]
      }
      get_public_grading_list: {
        Args: { p_branch_id?: string; p_from?: string; p_to?: string }
        Returns: {
          amount: number
          branch_country: string
          branch_id: string
          branch_name: string
          certificate_name: string
          current_belt: string
          end_time: string
          first_name: string
          grading_date: string
          last_name: string
          location: string
          paid_status: string
          proof_url: string
          registration_id: string
          remark: string
          result: string
          slot_id: string
          slot_title: string
          source: string
          start_time: string
          student_current_belt: string
          student_id: string
          student_name: string
          submission_id: string
          target_belt: string
        }[]
      }
      get_public_grading_products: {
        Args: {
          p_branch_id: string
          p_current_belts: string[]
          p_target_belts?: string[]
        }
        Returns: {
          base_price: number
          branch_price: number
          current_belt: string
          product_id: string
          product_name: string
        }[]
      }
      get_public_grading_slots:
        | {
            Args: { p_branch_id: string; p_product_ids: string[] }
            Returns: {
              branch_address: string
              branch_id: string
              branch_name: string
              end_time: string
              grading_date: string
              id: string
              location: string
              start_time: string
            }[]
          }
        | {
            Args: {
              p_branch_id: string
              p_dob?: string
              p_product_ids: string[]
            }
            Returns: {
              branch_address: string
              branch_id: string
              branch_name: string
              end_time: string
              grading_date: string
              id: string
              location: string
              start_time: string
              title: string
            }[]
          }
        | {
            Args: {
              p_branch_id: string
              p_current_belt?: string
              p_dob?: string
              p_product_ids: string[]
            }
            Returns: {
              branch_address: string
              branch_id: string
              branch_name: string
              end_time: string
              grading_date: string
              id: string
              location: string
              stage_product_branch_price: number
              stage_product_id: string
              stage_product_name: string
              start_time: string
              title: string
            }[]
          }
      get_public_grading_slots_by_date: {
        Args: { p_date: string }
        Returns: {
          branch_id: string
          branch_name: string
          end_time: string
          grading_date: string
          id: string
          start_time: string
          title: string
        }[]
      }
      get_public_guards_purchase_list: {
        Args: never
        Returns: {
          branch_id: string
          branch_name: string
          collected: boolean
          collected_at: string
          collected_by: string
          created_at: string
          current_belt: string
          date_of_birth: string
          email: string
          first_name: string
          gender: string
          gst_amount: number
          id: string
          invoice_id: string
          items: Json
          last_name: string
          matched_student_id: string
          notes: string
          payment_method: string
          phone: string
          proof_url: string
          reference_number: string
          sale_status: string
          subtotal: number
          total: number
          updated_at: string
          variant_selections: Json
        }[]
      }
      get_public_payment_options: {
        Args: { p_branch_id: string; p_current_belt: string }
        Returns: {
          bank_transfer_info: string
          branch_country: string
          paynow_qr_url: string
          product_id: string
          product_name: string
          product_price: number
          slot_date: string
          slot_end: string
          slot_id: string
          slot_location: string
          slot_start: string
        }[]
      }
      get_public_seminar_list: {
        Args: { p_branch_id?: string; p_status?: string }
        Returns: {
          amount: number
          branch_id: string
          branch_name: string
          collected: boolean
          collected_at: string
          created_at: string
          current_belt: string
          date_of_birth: string
          email: string
          first_name: string
          gender: string
          invoice_number: string
          last_name: string
          matched_invoice_id: string
          matched_student_id: string
          package_code: string
          package_label: string
          paid_status: string
          proof_url: string
          reference_number: string
          session_dates: string[]
          status: string
          student_name: string
          submission_id: string
        }[]
      }
      get_public_student_invoiced_terms: {
        Args: { p_session_id: string; p_student_id: string }
        Returns: {
          end_date: string
          is_current: boolean
          is_unlimited: boolean
          sessions_remaining: number
          sessions_total: number
          start_date: string
          term_id: string
          term_name: string
        }[]
      }
      get_public_student_term_bookings:
        | {
            Args: { p_session_id: string; p_student_id: string }
            Returns: {
              attendance_status: string
              class_type: string
              end_time: string
              id: string
              scheduled_date: string
              start_time: string
              status: string
              timetable_id: string
            }[]
          }
        | {
            Args: {
              p_session_id: string
              p_student_id: string
              p_term_id: string
            }
            Returns: {
              attendance_status: string
              class_type: string
              end_time: string
              id: string
              scheduled_date: string
              start_time: string
              status: string
              timetable_id: string
            }[]
          }
      get_public_student_term_context:
        | {
            Args: { p_session_id: string; p_student_id: string }
            Returns: {
              active_scheduled_count: number
              age: number
              attended_this_month: number
              branch_id: string
              class_type: string
              class_type_scopes: string[]
              country: string
              current_belt: string
              end_date: string
              enrollment_id: string
              is_unlimited: boolean
              missed_this_month: number
              sessions_remaining: number
              sessions_total: number
              start_date: string
              term_id: string
              term_name: string
              unbooked_count: number
            }[]
          }
        | {
            Args: {
              p_session_id: string
              p_student_id: string
              p_term_id: string
            }
            Returns: {
              active_scheduled_count: number
              age: number
              attended_this_month: number
              branch_id: string
              class_type: string
              class_type_scopes: string[]
              country: string
              current_belt: string
              end_date: string
              enrollment_id: string
              is_unlimited: boolean
              missed_this_month: number
              sessions_remaining: number
              sessions_total: number
              start_date: string
              term_id: string
              term_name: string
              unbooked_count: number
            }[]
          }
      get_public_term_slot_capacities:
        | {
            Args: {
              p_session_id: string
              p_student_id: string
              p_timetable_ids: string[]
            }
            Returns: {
              booked_count: number
              scheduled_date: string
              timetable_id: string
            }[]
          }
        | {
            Args: {
              p_session_id: string
              p_student_id: string
              p_term_id: string
              p_timetable_ids: string[]
            }
            Returns: {
              booked_count: number
              scheduled_date: string
              timetable_id: string
            }[]
          }
      get_student_by_auth_id_for_auth: {
        Args: { p_auth_user_id: string; p_email?: string }
        Returns: {
          student_email: string
          student_id: string
          student_name: string
        }[]
      }
      get_student_completed_grading_stages: {
        Args: { p_student_id: string }
        Returns: {
          stage_number: number
        }[]
      }
      has_admin_access: { Args: { permission_type: string }; Returns: boolean }
      has_branch_access: { Args: { p_branch_id?: string }; Returns: boolean }
      has_sales_access: { Args: never; Returns: boolean }
      has_sales_module_access: { Args: never; Returns: boolean }
      is_partner: { Args: never; Returns: boolean }
      is_student: { Args: never; Returns: boolean }
      is_superadmin: { Args: { user_email: string }; Returns: boolean }
      is_valid_belt_level: { Args: { belt_value: string }; Returns: boolean }
      is_valid_belt_level_array: {
        Args: { belt_values: string[] }
        Returns: boolean
      }
      log_booking_attempt: {
        Args: {
          p_attempt_result: string
          p_booking_date: string
          p_branch_id: string
          p_employee_id: string
          p_employee_name: string
          p_error_details?: Json
        }
        Returns: undefined
      }
      log_booking_failure: {
        Args: {
          booking_date: string
          branch_id: string
          employee_email: string
          employee_name: string
          failure_reason: string
          system_details?: Json
        }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_ip_address?: string
          p_user_agent?: string
          p_user_email: string
        }
        Returns: undefined
      }
      match_student_by_identity: {
        Args: {
          p_branch_id: string
          p_dob: string
          p_email?: string
          p_first_name: string
          p_gender?: string
          p_last_name: string
          p_phone?: string
        }
        Returns: {
          current_belt: string
          first_name: string
          gender: string
          id: string
          last_name: string
          status: string
        }[]
      }
      merge_students: {
        Args: { p_drop_ids: string[]; p_keep_id: string }
        Returns: Json
      }
      partner_create_approved_claim: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_description: string
          p_receipt_url: string
          p_submitted_date: string
          p_type: string
        }
        Returns: number
      }
      process_leave_encashment: {
        Args: { p_employee_id: string; p_processed_by?: string; p_year: number }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sms_current_email: { Args: never; Returns: string }
      sms_is_admin: { Args: never; Returns: boolean }
      sms_is_superadmin: { Args: never; Returns: boolean }
      submit_competition_payment: {
        Args: { _row: Json }
        Returns: {
          id: string
          reference_number: string
        }[]
      }
      submit_grading_payments: {
        Args: { _rows: Json }
        Returns: {
          id: string
          reference_number: string
        }[]
      }
      submit_guards_purchase: {
        Args: { _row: Json }
        Returns: {
          id: string
          reference_number: string
        }[]
      }
      submit_public_chat_invoice: {
        Args: {
          p_amount: number
          p_branch_id: string
          p_category: string
          p_items: Json
          p_payment_method: string
          p_proof_url: string
          p_session_id: string
          p_student_id: string
        }
        Returns: {
          invoice_id: string
          invoice_number: string
          payment_number: string
        }[]
      }
      submit_seminar_payment: {
        Args: { _row: Json }
        Returns: {
          id: string
          reference_number: string
        }[]
      }
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
