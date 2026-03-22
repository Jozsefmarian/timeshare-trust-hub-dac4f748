export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      ai_validation_results: {
        Row: {
          case_id: string;
          created_at: string;
          document_id: string;
          field_match_score: number | null;
          id: string;
          keyword_flags: Json | null;
          notes: string | null;
          updated_at: string;
          validation_status: string;
        };
        Insert: {
          case_id: string;
          created_at?: string;
          document_id: string;
          field_match_score?: number | null;
          id?: string;
          keyword_flags?: Json | null;
          notes?: string | null;
          updated_at?: string;
          validation_status?: string;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          document_id?: string;
          field_match_score?: number | null;
          id?: string;
          keyword_flags?: Json | null;
          notes?: string | null;
          updated_at?: string;
          validation_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_validation_results_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_validation_results_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          new_data: Json | null;
          old_data: Json | null;
          performed_by_user_id: string | null;
          source: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
          performed_by_user_id?: string | null;
          source?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
          performed_by_user_id?: string | null;
          source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_performed_by_user_id_fkey";
            columns: ["performed_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      case_status_history: {
        Row: {
          case_id: string;
          change_source: string | null;
          changed_by_user_id: string | null;
          created_at: string;
          from_status: string | null;
          id: string;
          note: string | null;
          to_status: string | null;
        };
        Insert: {
          case_id: string;
          change_source?: string | null;
          changed_by_user_id?: string | null;
          created_at?: string;
          from_status?: string | null;
          id?: string;
          note?: string | null;
          to_status?: string | null;
        };
        Update: {
          case_id?: string;
          change_source?: string | null;
          changed_by_user_id?: string | null;
          created_at?: string;
          from_status?: string | null;
          id?: string;
          note?: string | null;
          to_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "case_status_history_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_status_history_changed_by_user_id_fkey";
            columns: ["changed_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cases: {
        Row: {
          ai_pipeline_status?: string | null;
          case_number: string;
          classification: string | null;
          closed_at: string | null;
          created_at: string;
          current_step: string | null;
          id: string;
          internal_note: string | null;
          priority: string | null;
          seller_profile_id: string | null;
          seller_user_id: string;
          source: string | null;
          status: string;
          status_group: string | null;
          submitted_at: string | null;
          updated_at: string;
        };
        Insert: {
          ai_pipeline_status?: string | null;
          case_number: string;
          classification?: string | null;
          closed_at?: string | null;
          created_at?: string;
          current_step?: string | null;
          id?: string;
          internal_note?: string | null;
          priority?: string | null;
          seller_profile_id?: string | null;
          seller_user_id: string;
          source?: string | null;
          status?: string;
          status_group?: string | null;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          ai_pipeline_status?: string | null;
          case_number?: string;
          classification?: string | null;
          closed_at?: string | null;
          created_at?: string;
          current_step?: string | null;
          id?: string;
          internal_note?: string | null;
          priority?: string | null;
          seller_profile_id?: string | null;
          seller_user_id?: string;
          source?: string | null;
          status?: string;
          status_group?: string | null;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cases_seller_profile_id_fkey";
            columns: ["seller_profile_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_seller_user_id_fkey";
            columns: ["seller_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      check_results: {
        Row: {
          case_id: string;
          check_type: string;
          created_at: string;
          details: Json | null;
          document_id: string | null;
          id: string;
          message: string | null;
          result: string;
          severity: string | null;
        };
        Insert: {
          case_id: string;
          check_type: string;
          created_at?: string;
          details?: Json | null;
          document_id?: string | null;
          id?: string;
          message?: string | null;
          result: string;
          severity?: string | null;
        };
        Update: {
          case_id?: string;
          check_type?: string;
          created_at?: string;
          details?: Json | null;
          document_id?: string | null;
          id?: string;
          message?: string | null;
          result?: string;
          severity?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "check_results_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "check_results_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      classification_rules: {
        Row: {
          conditions: Json | null;
          created_at: string;
          id: string;
          is_active: boolean;
          message_template: string | null;
          policy_version_id: string;
          result_classification: string;
          rule_name: string;
          sort_order: number | null;
        };
        Insert: {
          conditions?: Json | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          message_template?: string | null;
          policy_version_id: string;
          result_classification: string;
          rule_name: string;
          sort_order?: number | null;
        };
        Update: {
          conditions?: Json | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          message_template?: string | null;
          policy_version_id?: string;
          result_classification?: string;
          rule_name?: string;
          sort_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "classification_rules_policy_version_id_fkey";
            columns: ["policy_version_id"];
            isOneToOne: false;
            referencedRelation: "policy_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      classifications: {
        Row: {
          case_id: string;
          classification: string;
          created_at: string;
          created_by: string | null;
          id: string;
          policy_version_id: string | null;
          reason_codes: string[] | null;
          reason_summary: string | null;
        };
        Insert: {
          case_id: string;
          classification: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          policy_version_id?: string | null;
          reason_codes?: string[] | null;
          reason_summary?: string | null;
        };
        Update: {
          case_id?: string;
          classification?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          policy_version_id?: string | null;
          reason_codes?: string[] | null;
          reason_summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "classifications_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      contracts: {
        Row: {
          case_id: string;
          contract_type: string;
          created_at: string;
          generated_at: string | null;
          generated_file_name: string | null;
          generated_file_path: string | null;
          generated_storage_bucket: string | null;
          generated_storage_path: string | null;
          id: string;
          seller_uploaded_signed_file_path: string | null;
          signed_file_name: string | null;
          signed_storage_bucket: string | null;
          signed_storage_path: string | null;
          signed_uploaded_at: string | null;
          status: string | null;
          template_version: string | null;
          updated_at: string;
        };
        Insert: {
          case_id: string;
          contract_type?: string;
          created_at?: string;
          generated_at?: string | null;
          generated_file_name?: string | null;
          generated_file_path?: string | null;
          generated_storage_bucket?: string | null;
          generated_storage_path?: string | null;
          id?: string;
          seller_uploaded_signed_file_path?: string | null;
          signed_file_name?: string | null;
          signed_storage_bucket?: string | null;
          signed_storage_path?: string | null;
          signed_uploaded_at?: string | null;
          status?: string | null;
          template_version?: string | null;
          updated_at?: string;
        };
        Update: {
          case_id?: string;
          contract_type?: string;
          created_at?: string;
          generated_at?: string | null;
          generated_file_name?: string | null;
          generated_file_path?: string | null;
          generated_storage_bucket?: string | null;
          generated_storage_path?: string | null;
          id?: string;
          seller_uploaded_signed_file_path?: string | null;
          signed_file_name?: string | null;
          signed_storage_bucket?: string | null;
          signed_storage_path?: string | null;
          signed_uploaded_at?: string | null;
          status?: string | null;
          template_version?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contracts_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      declaration_acceptances: {
        Row: {
          acceptance_hash: string | null;
          accepted_at: string;
          case_id: string;
          checkbox_checked: boolean;
          created_at: string;
          id: string;
          ip_address: string | null;
          service_agreement_id: string;
          typed_confirmation: string | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          acceptance_hash?: string | null;
          accepted_at?: string;
          case_id: string;
          checkbox_checked?: boolean;
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          service_agreement_id: string;
          typed_confirmation?: string | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          acceptance_hash?: string | null;
          accepted_at?: string;
          case_id?: string;
          checkbox_checked?: boolean;
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          service_agreement_id?: string;
          typed_confirmation?: string | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "declaration_acceptances_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "declaration_acceptances_service_agreement_id_fkey";
            columns: ["service_agreement_id"];
            isOneToOne: false;
            referencedRelation: "service_agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "declaration_acceptances_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      document_types: {
        Row: {
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          is_required: boolean;
          label: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          is_required?: boolean;
          label: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          is_required?: boolean;
          label?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_versions: {
        Row: {
          created_at: string;
          document_id: string;
          file_size_bytes: number | null;
          id: string;
          mime_type: string | null;
          original_file_name: string;
          storage_bucket: string;
          storage_path: string;
          uploaded_by_user_id: string;
          version_no: number;
        };
        Insert: {
          created_at?: string;
          document_id: string;
          file_size_bytes?: number | null;
          id?: string;
          mime_type?: string | null;
          original_file_name: string;
          storage_bucket?: string;
          storage_path: string;
          uploaded_by_user_id: string;
          version_no: number;
        };
        Update: {
          created_at?: string;
          document_id?: string;
          file_size_bytes?: number | null;
          id?: string;
          mime_type?: string | null;
          original_file_name?: string;
          storage_bucket?: string;
          storage_path?: string;
          uploaded_by_user_id?: string;
          version_no?: number;
        };
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_versions_uploaded_by_user_id_fkey";
            columns: ["uploaded_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          ai_status: string;
          case_id: string;
          created_at: string;
          document_type: string;
          document_type_id: string | null;
          file_name: string;
          file_path: string;
          file_size: number | null;
          file_size_bytes: number | null;
          id: string;
          is_latest: boolean;
          mime_type: string | null;
          ocr_status: string;
          original_file_name: string | null;
          parse_status: string;
          review_status: string;
          seller_user_id: string | null;
          storage_bucket: string;
          storage_path: string | null;
          updated_at: string;
          upload_status: string;
          uploaded_at: string;
          uploaded_by_user_id: string | null;
          validation_status: string;
          version_no: number;
        };
        Insert: {
          ai_status?: string;
          case_id: string;
          created_at?: string;
          document_type: string;
          document_type_id?: string | null;
          file_name: string;
          file_path: string;
          file_size?: number | null;
          file_size_bytes?: number | null;
          id?: string;
          is_latest?: boolean;
          mime_type?: string | null;
          ocr_status?: string;
          original_file_name?: string | null;
          parse_status?: string;
          review_status?: string;
          seller_user_id?: string | null;
          storage_bucket?: string;
          storage_path?: string | null;
          updated_at?: string;
          upload_status?: string;
          uploaded_at?: string;
          uploaded_by_user_id?: string | null;
          validation_status?: string;
          version_no?: number;
        };
        Update: {
          ai_status?: string;
          case_id?: string;
          created_at?: string;
          document_type?: string;
          document_type_id?: string | null;
          file_name?: string;
          file_path?: string;
          file_size?: number | null;
          file_size_bytes?: number | null;
          id?: string;
          is_latest?: boolean;
          mime_type?: string | null;
          ocr_status?: string;
          original_file_name?: string | null;
          parse_status?: string;
          review_status?: string;
          seller_user_id?: string | null;
          storage_bucket?: string;
          storage_path?: string | null;
          updated_at?: string;
          upload_status?: string;
          uploaded_at?: string;
          uploaded_by_user_id?: string | null;
          validation_status?: string;
          version_no?: number;
        };
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_document_type_id_fkey";
            columns: ["document_type_id"];
            isOneToOne: false;
            referencedRelation: "document_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_seller_user_id_fkey";
            columns: ["seller_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_uploaded_by_user_id_fkey";
            columns: ["uploaded_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number | null;
          case_id: string;
          created_at: string;
          currency: string | null;
          id: string;
          invoice_url: string | null;
          paid_at: string | null;
          raw_payload: Json | null;
          status: string;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          updated_at: string;
        };
        Insert: {
          amount?: number | null;
          case_id: string;
          created_at?: string;
          currency?: string | null;
          id?: string;
          invoice_url?: string | null;
          paid_at?: string | null;
          raw_payload?: Json | null;
          status?: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number | null;
          case_id?: string;
          created_at?: string;
          currency?: string | null;
          id?: string;
          invoice_url?: string | null;
          paid_at?: string | null;
          raw_payload?: Json | null;
          status?: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      policy_versions: {
        Row: {
          created_at: string;
          created_by_user_id: string | null;
          id: string;
          name: string;
          published_at: string | null;
          status: string;
          updated_at: string;
          version: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          name: string;
          published_at?: string | null;
          status: string;
          updated_at?: string;
          version: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          name?: string;
          published_at?: string | null;
          status?: string;
          updated_at?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "policy_versions_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      resorts: {
        Row: {
          brand: string | null;
          city: string | null;
          code: string | null;
          country: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          is_supported: boolean;
          name: string;
          notes: string | null;
          operator_name: string | null;
          updated_at: string;
        };
        Insert: {
          brand?: string | null;
          city?: string | null;
          code?: string | null;
          country?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_supported?: boolean;
          name: string;
          notes?: string | null;
          operator_name?: string | null;
          updated_at?: string;
        };
        Update: {
          brand?: string | null;
          city?: string | null;
          code?: string | null;
          country?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_supported?: boolean;
          name?: string;
          notes?: string | null;
          operator_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      restriction_rules: {
        Row: {
          created_at: string;
          field_name: string | null;
          id: string;
          is_active: boolean;
          match_value: string | null;
          message_template: string | null;
          operator: string | null;
          policy_version_id: string;
          rule_type: string;
          severity: string | null;
          sort_order: number | null;
        };
        Insert: {
          created_at?: string;
          field_name?: string | null;
          id?: string;
          is_active?: boolean;
          match_value?: string | null;
          message_template?: string | null;
          operator?: string | null;
          policy_version_id: string;
          rule_type: string;
          severity?: string | null;
          sort_order?: number | null;
        };
        Update: {
          created_at?: string;
          field_name?: string | null;
          id?: string;
          is_active?: boolean;
          match_value?: string | null;
          message_template?: string | null;
          operator?: string | null;
          policy_version_id?: string;
          rule_type?: string;
          severity?: string | null;
          sort_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "restriction_rules_policy_version_id_fkey";
            columns: ["policy_version_id"];
            isOneToOne: false;
            referencedRelation: "policy_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_profiles: {
        Row: {
          billing_address: string | null;
          billing_name: string | null;
          created_at: string;
          id: string;
          id_number: string | null;
          notes: string | null;
          tax_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          billing_address?: string | null;
          billing_name?: string | null;
          created_at?: string;
          id?: string;
          id_number?: string | null;
          notes?: string | null;
          tax_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          billing_address?: string | null;
          billing_name?: string | null;
          created_at?: string;
          id?: string;
          id_number?: string | null;
          notes?: string | null;
          tax_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      service_agreements: {
        Row: {
          created_at: string;
          html_content: string | null;
          id: string;
          is_active: boolean;
          pdf_path: string | null;
          published_at: string | null;
          title: string | null;
          updated_at: string;
          version: string;
        };
        Insert: {
          created_at?: string;
          html_content?: string | null;
          id?: string;
          is_active?: boolean;
          pdf_path?: string | null;
          published_at?: string | null;
          title?: string | null;
          updated_at?: string;
          version: string;
        };
        Update: {
          created_at?: string;
          html_content?: string | null;
          id?: string;
          is_active?: boolean;
          pdf_path?: string | null;
          published_at?: string | null;
          title?: string | null;
          updated_at?: string;
          version?: string;
        };
        Relationships: [];
      };
      week_assets: {
        Row: {
          acquisition_date: string | null;
          created_at: string;
          id: string;
          is_fixed_week: boolean | null;
          notes: string | null;
          resort_id: string | null;
          rights_end_year: number | null;
          rights_start_year: number | null;
          season_label: string | null;
          share_count: number | null;
          share_related: boolean | null;
          source_case_id: string;
          status: string;
          unit_type: string | null;
          updated_at: string;
          week_number: number | null;
        };
        Insert: {
          acquisition_date?: string | null;
          created_at?: string;
          id?: string;
          is_fixed_week?: boolean | null;
          notes?: string | null;
          resort_id?: string | null;
          rights_end_year?: number | null;
          rights_start_year?: number | null;
          season_label?: string | null;
          share_count?: number | null;
          share_related?: boolean | null;
          source_case_id: string;
          status?: string;
          unit_type?: string | null;
          updated_at?: string;
          week_number?: number | null;
        };
        Update: {
          acquisition_date?: string | null;
          created_at?: string;
          id?: string;
          is_fixed_week?: boolean | null;
          notes?: string | null;
          resort_id?: string | null;
          rights_end_year?: number | null;
          rights_start_year?: number | null;
          season_label?: string | null;
          share_count?: number | null;
          share_related?: boolean | null;
          source_case_id?: string;
          status?: string;
          unit_type?: string | null;
          updated_at?: string;
          week_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "week_assets_resort_id_fkey";
            columns: ["resort_id"];
            isOneToOne: false;
            referencedRelation: "resorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "week_assets_source_case_id_fkey";
            columns: ["source_case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      week_offers: {
        Row: {
          annual_fee: number | null;
          case_id: string;
          created_at: string;
          currency: string | null;
          id: string;
          is_fixed_week: boolean | null;
          notes: string | null;
          resort_id: string | null;
          resort_name_raw: string | null;
          rights_end_year: number | null;
          rights_start_year: number | null;
          season_label: string | null;
          seller_declared_value: number | null;
          share_count: number | null;
          share_related: boolean | null;
          unit_type: string | null;
          updated_at: string;
          week_number: number | null;
        };
        Insert: {
          annual_fee?: number | null;
          case_id: string;
          created_at?: string;
          currency?: string | null;
          id?: string;
          is_fixed_week?: boolean | null;
          notes?: string | null;
          resort_id?: string | null;
          resort_name_raw?: string | null;
          rights_end_year?: number | null;
          rights_start_year?: number | null;
          season_label?: string | null;
          seller_declared_value?: number | null;
          share_count?: number | null;
          share_related?: boolean | null;
          unit_type?: string | null;
          updated_at?: string;
          week_number?: number | null;
        };
        Update: {
          annual_fee?: number | null;
          case_id?: string;
          created_at?: string;
          currency?: string | null;
          id?: string;
          is_fixed_week?: boolean | null;
          notes?: string | null;
          resort_id?: string | null;
          resort_name_raw?: string | null;
          rights_end_year?: number | null;
          rights_start_year?: number | null;
          season_label?: string | null;
          seller_declared_value?: number | null;
          share_count?: number | null;
          share_related?: boolean | null;
          unit_type?: string | null;
          updated_at?: string;
          week_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "week_offers_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "week_offers_resort_id_fkey";
            columns: ["resort_id"];
            isOneToOne: false;
            referencedRelation: "resorts";
            referencedColumns: ["id"];
          },
        ];
      };
      yearly_inventory: {
        Row: {
          availability_status: string;
          created_at: string;
          generated_at: string | null;
          id: string;
          inventory_year: number;
          release_status: string | null;
          updated_at: string;
          week_asset_id: string;
          week_number: number;
        };
        Insert: {
          availability_status?: string;
          created_at?: string;
          generated_at?: string | null;
          id?: string;
          inventory_year: number;
          release_status?: string | null;
          updated_at?: string;
          week_asset_id: string;
          week_number: number;
        };
        Update: {
          availability_status?: string;
          created_at?: string;
          generated_at?: string | null;
          id?: string;
          inventory_year?: number;
          release_status?: string | null;
          updated_at?: string;
          week_asset_id?: string;
          week_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "yearly_inventory_week_asset_id_fkey";
            columns: ["week_asset_id"];
            isOneToOne: false;
            referencedRelation: "week_assets";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
