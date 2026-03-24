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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abbazia_shares: {
        Row: {
          case_id: string
          created_at: string
          id: string
          isin: string | null
          nominal_value: number | null
          securities_account_id: string | null
          securities_account_provider: string | null
          securities_account_required: boolean
          share_count: number | null
          share_series: string | null
          transfer_status: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          isin?: string | null
          nominal_value?: number | null
          securities_account_id?: string | null
          securities_account_provider?: string | null
          securities_account_required?: boolean
          share_count?: number | null
          share_series?: string | null
          transfer_status?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          isin?: string | null
          nominal_value?: number | null
          securities_account_id?: string | null
          securities_account_provider?: string | null
          securities_account_required?: boolean
          share_count?: number | null
          share_series?: string | null
          transfer_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "abbazia_shares_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_validation_jobs: {
        Row: {
          attempt_count: number
          case_id: string
          completed_at: string | null
          created_at: string
          document_id: string | null
          error_message: string | null
          id: string
          input_payload: Json
          job_type: string
          output_payload: Json
          policy_version_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ai_job_status_enum"]
        }
        Insert: {
          attempt_count?: number
          case_id: string
          completed_at?: string | null
          created_at?: string
          document_id?: string | null
          error_message?: string | null
          id?: string
          input_payload?: Json
          job_type: string
          output_payload?: Json
          policy_version_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_job_status_enum"]
        }
        Update: {
          attempt_count?: number
          case_id?: string
          completed_at?: string | null
          created_at?: string
          document_id?: string | null
          error_message?: string | null
          id?: string
          input_payload?: Json
          job_type?: string
          output_payload?: Json
          policy_version_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_job_status_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "ai_validation_jobs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_validation_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_validation_jobs_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_validation_results: {
        Row: {
          case_id: string
          created_at: string
          details: Json
          document_id: string
          extracted_value: string | null
          field_key: string | null
          field_match_score: number | null
          id: string
          keyword_flags: Json | null
          normalized_extracted_value: string | null
          notes: string | null
          result_type: string | null
          updated_at: string
          validation_status: string
        }
        Insert: {
          case_id: string
          created_at?: string
          details?: Json
          document_id: string
          extracted_value?: string | null
          field_key?: string | null
          field_match_score?: number | null
          id?: string
          keyword_flags?: Json | null
          normalized_extracted_value?: string | null
          notes?: string | null
          result_type?: string | null
          updated_at?: string
          validation_status?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          details?: Json
          document_id?: string
          extracted_value?: string | null
          field_key?: string | null
          field_match_score?: number | null
          id?: string
          keyword_flags?: Json | null
          normalized_extracted_value?: string | null
          notes?: string | null
          result_type?: string | null
          updated_at?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_validation_results_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_validation_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          performed_by_user_id: string | null
          source: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by_user_id?: string | null
          source?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by_user_id?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_performed_by_user_id_fkey"
            columns: ["performed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_classification_results: {
        Row: {
          case_id: string
          classification: Database["public"]["Enums"]["classification_enum"]
          created_at: string
          decided_by: string | null
          details: Json
          id: string
          policy_version_id: string | null
          reason_codes: string[]
          reason_summary: string | null
          source: string
        }
        Insert: {
          case_id: string
          classification: Database["public"]["Enums"]["classification_enum"]
          created_at?: string
          decided_by?: string | null
          details?: Json
          id?: string
          policy_version_id?: string | null
          reason_codes?: string[]
          reason_summary?: string | null
          source?: string
        }
        Update: {
          case_id?: string
          classification?: Database["public"]["Enums"]["classification_enum"]
          created_at?: string
          decided_by?: string | null
          details?: Json
          id?: string
          policy_version_id?: string | null
          reason_codes?: string[]
          reason_summary?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_classification_results_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_classification_results_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      case_restriction_hits: {
        Row: {
          action: Database["public"]["Enums"]["restriction_action_enum"]
          case_id: string
          created_at: string
          details: Json
          document_id: string | null
          excerpt: string | null
          id: string
          matched_text: string
          page_number: number | null
          policy_version_id: string | null
          rule_id: string | null
          severity: Database["public"]["Enums"]["restriction_severity_enum"]
        }
        Insert: {
          action: Database["public"]["Enums"]["restriction_action_enum"]
          case_id: string
          created_at?: string
          details?: Json
          document_id?: string | null
          excerpt?: string | null
          id?: string
          matched_text: string
          page_number?: number | null
          policy_version_id?: string | null
          rule_id?: string | null
          severity: Database["public"]["Enums"]["restriction_severity_enum"]
        }
        Update: {
          action?: Database["public"]["Enums"]["restriction_action_enum"]
          case_id?: string
          created_at?: string
          details?: Json
          document_id?: string | null
          excerpt?: string | null
          id?: string
          matched_text?: string
          page_number?: number | null
          policy_version_id?: string | null
          rule_id?: string | null
          severity?: Database["public"]["Enums"]["restriction_severity_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "case_restriction_hits_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_restriction_hits_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_restriction_hits_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_restriction_hits_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "policy_restriction_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      case_status_history: {
        Row: {
          case_id: string
          change_source: string | null
          changed_by_user_id: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string | null
        }
        Insert: {
          case_id: string
          change_source?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Update: {
          case_id?: string
          change_source?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_status_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_status_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          ai_pipeline_status: Database["public"]["Enums"]["ai_job_status_enum"]
          case_number: string
          classification: string | null
          classification_reason_codes: string[]
          closed_at: string | null
          created_at: string
          current_step: string | null
          data_match_status: Database["public"]["Enums"]["ai_result_status_enum"]
          id: string
          internal_note: string | null
          policy_version_id_applied: string | null
          priority: string | null
          recheck_count: number
          restriction_check_status: Database["public"]["Enums"]["ai_result_status_enum"]
          seller_profile_id: string | null
          seller_user_id: string
          source: string | null
          status: string
          status_group: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          ai_pipeline_status?: Database["public"]["Enums"]["ai_job_status_enum"]
          case_number: string
          classification?: string | null
          classification_reason_codes?: string[]
          closed_at?: string | null
          created_at?: string
          current_step?: string | null
          data_match_status?: Database["public"]["Enums"]["ai_result_status_enum"]
          id?: string
          internal_note?: string | null
          policy_version_id_applied?: string | null
          priority?: string | null
          recheck_count?: number
          restriction_check_status?: Database["public"]["Enums"]["ai_result_status_enum"]
          seller_profile_id?: string | null
          seller_user_id: string
          source?: string | null
          status?: string
          status_group?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          ai_pipeline_status?: Database["public"]["Enums"]["ai_job_status_enum"]
          case_number?: string
          classification?: string | null
          classification_reason_codes?: string[]
          closed_at?: string | null
          created_at?: string
          current_step?: string | null
          data_match_status?: Database["public"]["Enums"]["ai_result_status_enum"]
          id?: string
          internal_note?: string | null
          policy_version_id_applied?: string | null
          priority?: string | null
          recheck_count?: number
          restriction_check_status?: Database["public"]["Enums"]["ai_result_status_enum"]
          seller_profile_id?: string | null
          seller_user_id?: string
          source?: string | null
          status?: string
          status_group?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_policy_version_id_applied_fkey"
            columns: ["policy_version_id_applied"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_seller_profile_id_fkey"
            columns: ["seller_profile_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_seller_user_id_fkey"
            columns: ["seller_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      check_results: {
        Row: {
          case_id: string
          check_type: string
          created_at: string
          details: Json | null
          document_id: string | null
          id: string
          message: string | null
          result: string
          severity: string | null
        }
        Insert: {
          case_id: string
          check_type: string
          created_at?: string
          details?: Json | null
          document_id?: string | null
          id?: string
          message?: string | null
          result: string
          severity?: string | null
        }
        Update: {
          case_id?: string
          check_type?: string
          created_at?: string
          details?: Json | null
          document_id?: string | null
          id?: string
          message?: string | null
          result?: string
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_results_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      classification_rules: {
        Row: {
          conditions: Json | null
          created_at: string
          id: string
          is_active: boolean
          message_template: string | null
          policy_version_id: string
          result_classification: string
          rule_name: string
          sort_order: number | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string | null
          policy_version_id: string
          result_classification: string
          rule_name: string
          sort_order?: number | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string | null
          policy_version_id?: string
          result_classification?: string
          rule_name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "classification_rules_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      classifications: {
        Row: {
          case_id: string
          classification: string
          created_at: string
          created_by: string | null
          id: string
          policy_version_id: string | null
          reason_codes: string[] | null
          reason_summary: string | null
        }
        Insert: {
          case_id: string
          classification: string
          created_at?: string
          created_by?: string | null
          id?: string
          policy_version_id?: string | null
          reason_codes?: string[] | null
          reason_summary?: string | null
        }
        Update: {
          case_id?: string
          classification?: string
          created_at?: string
          created_by?: string | null
          id?: string
          policy_version_id?: string | null
          reason_codes?: string[] | null
          reason_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          case_id: string
          contract_type: string
          created_at: string
          generated_at: string | null
          generated_file_name: string | null
          generated_file_path: string | null
          generated_storage_bucket: string | null
          generated_storage_path: string | null
          id: string
          seller_uploaded_signed_file_path: string | null
          signed_file_name: string | null
          signed_storage_bucket: string | null
          signed_storage_path: string | null
          signed_uploaded_at: string | null
          status: string | null
          template_version: string | null
          updated_at: string
        }
        Insert: {
          case_id: string
          contract_type?: string
          created_at?: string
          generated_at?: string | null
          generated_file_name?: string | null
          generated_file_path?: string | null
          generated_storage_bucket?: string | null
          generated_storage_path?: string | null
          id?: string
          seller_uploaded_signed_file_path?: string | null
          signed_file_name?: string | null
          signed_storage_bucket?: string | null
          signed_storage_path?: string | null
          signed_uploaded_at?: string | null
          status?: string | null
          template_version?: string | null
          updated_at?: string
        }
        Update: {
          case_id?: string
          contract_type?: string
          created_at?: string
          generated_at?: string | null
          generated_file_name?: string | null
          generated_file_path?: string | null
          generated_storage_bucket?: string | null
          generated_storage_path?: string | null
          id?: string
          seller_uploaded_signed_file_path?: string | null
          signed_file_name?: string | null
          signed_storage_bucket?: string | null
          signed_storage_path?: string | null
          signed_uploaded_at?: string | null
          status?: string | null
          template_version?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      declaration_acceptances: {
        Row: {
          acceptance_hash: string | null
          accepted_at: string
          case_id: string
          checkbox_checked: boolean
          confirmation_sent_at: string | null
          created_at: string
          hash_algorithm: string | null
          id: string
          ip_address: string | null
          service_agreement_id: string
          typed_confirmation: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acceptance_hash?: string | null
          accepted_at?: string
          case_id: string
          checkbox_checked?: boolean
          confirmation_sent_at?: string | null
          created_at?: string
          hash_algorithm?: string | null
          id?: string
          ip_address?: string | null
          service_agreement_id: string
          typed_confirmation?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          acceptance_hash?: string | null
          accepted_at?: string
          case_id?: string
          checkbox_checked?: boolean
          confirmation_sent_at?: string | null
          created_at?: string
          hash_algorithm?: string | null
          id?: string
          ip_address?: string | null
          service_agreement_id?: string
          typed_confirmation?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "declaration_acceptances_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "declaration_acceptances_service_agreement_id_fkey"
            columns: ["service_agreement_id"]
            isOneToOne: false
            referencedRelation: "service_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "declaration_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_required: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          created_at: string
          document_id: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          original_file_name: string
          storage_bucket: string
          storage_path: string
          uploaded_by_user_id: string
          version_no: number
        }
        Insert: {
          created_at?: string
          document_id: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          original_file_name: string
          storage_bucket?: string
          storage_path: string
          uploaded_by_user_id: string
          version_no: number
        }
        Update: {
          created_at?: string
          document_id?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          original_file_name?: string
          storage_bucket?: string
          storage_path?: string
          uploaded_by_user_id?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_status: string
          case_id: string
          created_at: string
          document_type: string
          document_type_id: string | null
          extracted_fields: Json
          extracted_text: Json
          file_name: string
          file_path: string
          file_size: number | null
          file_size_bytes: number | null
          id: string
          is_latest: boolean
          last_ai_job_id: string | null
          mime_type: string | null
          ocr_status: string
          original_file_name: string | null
          parse_status: string
          review_status: string
          seller_user_id: string | null
          storage_bucket: string
          storage_path: string | null
          updated_at: string
          upload_status: string
          uploaded_at: string
          uploaded_by_user_id: string | null
          validation_status: string
          version_no: number
        }
        Insert: {
          ai_status?: string
          case_id: string
          created_at?: string
          document_type: string
          document_type_id?: string | null
          extracted_fields?: Json
          extracted_text?: Json
          file_name: string
          file_path: string
          file_size?: number | null
          file_size_bytes?: number | null
          id?: string
          is_latest?: boolean
          last_ai_job_id?: string | null
          mime_type?: string | null
          ocr_status?: string
          original_file_name?: string | null
          parse_status?: string
          review_status?: string
          seller_user_id?: string | null
          storage_bucket?: string
          storage_path?: string | null
          updated_at?: string
          upload_status?: string
          uploaded_at?: string
          uploaded_by_user_id?: string | null
          validation_status?: string
          version_no?: number
        }
        Update: {
          ai_status?: string
          case_id?: string
          created_at?: string
          document_type?: string
          document_type_id?: string | null
          extracted_fields?: Json
          extracted_text?: Json
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_size_bytes?: number | null
          id?: string
          is_latest?: boolean
          last_ai_job_id?: string | null
          mime_type?: string | null
          ocr_status?: string
          original_file_name?: string | null
          parse_status?: string
          review_status?: string
          seller_user_id?: string | null
          storage_bucket?: string
          storage_path?: string | null
          updated_at?: string
          upload_status?: string
          uploaded_at?: string
          uploaded_by_user_id?: string | null
          validation_status?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_seller_user_id_fkey"
            columns: ["seller_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          case_id: string
          created_at: string
          currency: string | null
          id: string
          invoice_url: string | null
          paid_at: string | null
          raw_payload: Json | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          case_id: string
          created_at?: string
          currency?: string | null
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          raw_payload?: Json | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          case_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          raw_payload?: Json | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_classification_rules: {
        Row: {
          created_at: string
          field_key: string
          id: string
          is_active: boolean
          operator: Database["public"]["Enums"]["policy_operator_enum"]
          policy_version_id: string
          reason_code: string
          scope: Database["public"]["Enums"]["policy_rule_scope_enum"]
          seller_message: string | null
          sort_index: number
          updated_at: string
          value_json: Json | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          field_key: string
          id?: string
          is_active?: boolean
          operator: Database["public"]["Enums"]["policy_operator_enum"]
          policy_version_id: string
          reason_code: string
          scope: Database["public"]["Enums"]["policy_rule_scope_enum"]
          seller_message?: string | null
          sort_index?: number
          updated_at?: string
          value_json?: Json | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          field_key?: string
          id?: string
          is_active?: boolean
          operator?: Database["public"]["Enums"]["policy_operator_enum"]
          policy_version_id?: string
          reason_code?: string
          scope?: Database["public"]["Enums"]["policy_rule_scope_enum"]
          seller_message?: string | null
          sort_index?: number
          updated_at?: string
          value_json?: Json | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_classification_rules_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_message_templates: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["message_channel_enum"]
          created_at: string
          id: string
          is_active: boolean
          policy_version_id: string
          subject: string | null
          template_key: string
          updated_at: string
        }
        Insert: {
          body: string
          channel?: Database["public"]["Enums"]["message_channel_enum"]
          created_at?: string
          id?: string
          is_active?: boolean
          policy_version_id: string
          subject?: string | null
          template_key: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["message_channel_enum"]
          created_at?: string
          id?: string
          is_active?: boolean
          policy_version_id?: string
          subject?: string | null
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_message_templates_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_restriction_rules: {
        Row: {
          action: Database["public"]["Enums"]["restriction_action_enum"]
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          pattern: string
          policy_version_id: string
          rule_type: Database["public"]["Enums"]["policy_rule_type_enum"]
          severity: Database["public"]["Enums"]["restriction_severity_enum"]
          sort_index: number
          updated_at: string
          weight: number
        }
        Insert: {
          action?: Database["public"]["Enums"]["restriction_action_enum"]
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          pattern: string
          policy_version_id: string
          rule_type?: Database["public"]["Enums"]["policy_rule_type_enum"]
          severity?: Database["public"]["Enums"]["restriction_severity_enum"]
          sort_index?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          action?: Database["public"]["Enums"]["restriction_action_enum"]
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          pattern?: string
          policy_version_id?: string
          rule_type?: Database["public"]["Enums"]["policy_rule_type_enum"]
          severity?: Database["public"]["Enums"]["restriction_severity_enum"]
          sort_index?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_restriction_rules_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_settings: {
        Row: {
          created_at: string
          id: string
          policy_version_id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          policy_version_id: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          policy_version_id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_settings_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_versions: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          id: string
          name: string
          published_at: string | null
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          name: string
          published_at?: string | null
          status: string
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          name?: string
          published_at?: string | null
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_versions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      resorts: {
        Row: {
          brand: string | null
          city: string | null
          code: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          is_supported: boolean
          name: string
          notes: string | null
          operator_name: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_supported?: boolean
          name: string
          notes?: string | null
          operator_name?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_supported?: boolean
          name?: string
          notes?: string | null
          operator_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      restriction_rules: {
        Row: {
          created_at: string
          field_name: string | null
          id: string
          is_active: boolean
          match_value: string | null
          message_template: string | null
          operator: string | null
          policy_version_id: string
          rule_type: string
          severity: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          field_name?: string | null
          id?: string
          is_active?: boolean
          match_value?: string | null
          message_template?: string | null
          operator?: string | null
          policy_version_id: string
          rule_type: string
          severity?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          field_name?: string | null
          id?: string
          is_active?: boolean
          match_value?: string | null
          message_template?: string | null
          operator?: string | null
          policy_version_id?: string
          rule_type?: string
          severity?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "restriction_rules_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          billing_address: string | null
          billing_name: string | null
          birth_date: string | null
          birth_place: string | null
          created_at: string
          id: string
          id_number: string | null
          mother_name: string | null
          notes: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address?: string | null
          billing_name?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          id?: string
          id_number?: string | null
          mother_name?: string | null
          notes?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address?: string | null
          billing_name?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          id?: string
          id_number?: string | null
          mother_name?: string | null
          notes?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_agreements: {
        Row: {
          created_at: string
          html_content: string | null
          id: string
          is_active: boolean
          pdf_path: string | null
          published_at: string | null
          title: string | null
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          html_content?: string | null
          id?: string
          is_active?: boolean
          pdf_path?: string | null
          published_at?: string | null
          title?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          html_content?: string | null
          id?: string
          is_active?: boolean
          pdf_path?: string | null
          published_at?: string | null
          title?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      week_assets: {
        Row: {
          acquisition_date: string | null
          created_at: string
          id: string
          is_fixed_week: boolean | null
          notes: string | null
          resort_id: string | null
          rights_end_year: number | null
          rights_start_year: number | null
          season_label: string | null
          share_count: number | null
          share_related: boolean | null
          source_case_id: string
          status: string
          unit_type: string | null
          updated_at: string
          week_number: number | null
        }
        Insert: {
          acquisition_date?: string | null
          created_at?: string
          id?: string
          is_fixed_week?: boolean | null
          notes?: string | null
          resort_id?: string | null
          rights_end_year?: number | null
          rights_start_year?: number | null
          season_label?: string | null
          share_count?: number | null
          share_related?: boolean | null
          source_case_id: string
          status?: string
          unit_type?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          acquisition_date?: string | null
          created_at?: string
          id?: string
          is_fixed_week?: boolean | null
          notes?: string | null
          resort_id?: string | null
          rights_end_year?: number | null
          rights_start_year?: number | null
          season_label?: string | null
          share_count?: number | null
          share_related?: boolean | null
          source_case_id?: string
          status?: string
          unit_type?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "week_assets_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "week_assets_source_case_id_fkey"
            columns: ["source_case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      week_offers: {
        Row: {
          annual_fee: number | null
          case_id: string
          created_at: string
          currency: string | null
          id: string
          is_fixed_week: boolean | null
          notes: string | null
          resort_id: string | null
          resort_name_raw: string | null
          rights_end_year: number | null
          rights_start_year: number | null
          season_label: string | null
          seller_declared_value: number | null
          share_count: number | null
          share_related: boolean | null
          unit_type: string | null
          updated_at: string
          usage_frequency: string | null
          usage_parity: string | null
          week_number: number | null
        }
        Insert: {
          annual_fee?: number | null
          case_id: string
          created_at?: string
          currency?: string | null
          id?: string
          is_fixed_week?: boolean | null
          notes?: string | null
          resort_id?: string | null
          resort_name_raw?: string | null
          rights_end_year?: number | null
          rights_start_year?: number | null
          season_label?: string | null
          seller_declared_value?: number | null
          share_count?: number | null
          share_related?: boolean | null
          unit_type?: string | null
          updated_at?: string
          usage_frequency?: string | null
          usage_parity?: string | null
          week_number?: number | null
        }
        Update: {
          annual_fee?: number | null
          case_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          is_fixed_week?: boolean | null
          notes?: string | null
          resort_id?: string | null
          resort_name_raw?: string | null
          rights_end_year?: number | null
          rights_start_year?: number | null
          season_label?: string | null
          seller_declared_value?: number | null
          share_count?: number | null
          share_related?: boolean | null
          unit_type?: string | null
          updated_at?: string
          usage_frequency?: string | null
          usage_parity?: string | null
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "week_offers_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "week_offers_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
        ]
      }
      yearly_inventory: {
        Row: {
          availability_status: string
          created_at: string
          generated_at: string | null
          id: string
          inventory_year: number
          release_status: string | null
          updated_at: string
          week_asset_id: string
          week_number: number
        }
        Insert: {
          availability_status?: string
          created_at?: string
          generated_at?: string | null
          id?: string
          inventory_year: number
          release_status?: string | null
          updated_at?: string
          week_asset_id: string
          week_number: number
        }
        Update: {
          availability_status?: string
          created_at?: string
          generated_at?: string | null
          id?: string
          inventory_year?: number
          release_status?: string | null
          updated_at?: string
          week_asset_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "yearly_inventory_week_asset_id_fkey"
            columns: ["week_asset_id"]
            isOneToOne: false
            referencedRelation: "week_assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_case_classification: {
        Args: {
          p_case_id: string
          p_classification: string
          p_created_by?: string
          p_policy_version_id?: string
          p_reason_codes?: Json
          p_reason_summary?: string
        }
        Returns: string
      }
      get_published_policy_version_id: { Args: never; Returns: string }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      is_seller: { Args: never; Returns: boolean }
      mark_case_ai_processing: {
        Args: { p_case_id: string }
        Returns: undefined
      }
      mcp_get_table_schema: {
        Args: { p_table_name: string }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      mcp_list_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
    }
    Enums: {
      ai_job_status_enum:
        | "queued"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      ai_result_status_enum:
        | "pending"
        | "match_ok"
        | "mismatch"
        | "no_restriction_found"
        | "restriction_suspected"
        | "restriction_confirmed"
        | "error"
      case_status_enum:
        | "draft"
        | "submitted"
        | "documents_uploaded"
        | "ai_processing"
        | "yellow_review"
        | "red_rejected"
        | "green_approved"
        | "contract_generated"
        | "awaiting_signed_contract"
        | "signed_contract_uploaded"
        | "service_agreement_signed"
        | "payment_pending"
        | "payment_completed"
        | "case_closed"
        | "cancelled"
        | "stuck_needs_support"
      classification_enum: "red" | "yellow" | "green"
      message_channel_enum: "ui" | "email" | "both"
      policy_operator_enum:
        | "equals"
        | "not_equals"
        | "contains"
        | "not_contains"
        | "is_empty"
        | "is_not_empty"
        | "greater_than"
        | "greater_or_equal"
        | "less_than"
        | "less_or_equal"
        | "in_list"
      policy_rule_scope_enum: "red" | "yellow"
      policy_rule_type_enum: "keyword" | "regex"
      policy_version_status_enum: "draft" | "published" | "archived"
      restriction_action_enum:
        | "flag_manual_legal"
        | "auto_reject"
        | "allow_but_yellow"
      restriction_severity_enum: "suspected" | "confirmed"
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
      ai_job_status_enum: [
        "queued",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      ai_result_status_enum: [
        "pending",
        "match_ok",
        "mismatch",
        "no_restriction_found",
        "restriction_suspected",
        "restriction_confirmed",
        "error",
      ],
      case_status_enum: [
        "draft",
        "submitted",
        "documents_uploaded",
        "ai_processing",
        "yellow_review",
        "red_rejected",
        "green_approved",
        "contract_generated",
        "awaiting_signed_contract",
        "signed_contract_uploaded",
        "service_agreement_signed",
        "payment_pending",
        "payment_completed",
        "case_closed",
        "cancelled",
        "stuck_needs_support",
      ],
      classification_enum: ["red", "yellow", "green"],
      message_channel_enum: ["ui", "email", "both"],
      policy_operator_enum: [
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "is_empty",
        "is_not_empty",
        "greater_than",
        "greater_or_equal",
        "less_than",
        "less_or_equal",
        "in_list",
      ],
      policy_rule_scope_enum: ["red", "yellow"],
      policy_rule_type_enum: ["keyword", "regex"],
      policy_version_status_enum: ["draft", "published", "archived"],
      restriction_action_enum: [
        "flag_manual_legal",
        "auto_reject",
        "allow_but_yellow",
      ],
      restriction_severity_enum: ["suspected", "confirmed"],
    },
  },
} as const
