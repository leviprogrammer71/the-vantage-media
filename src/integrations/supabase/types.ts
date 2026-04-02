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
      credit_transactions: {
        Row: {
          created_at: string | null
          credits_amount: number
          description: string | null
          id: string
          image_id: string | null
          submission_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_amount: number
          description?: string | null
          id?: string
          image_id?: string | null
          submission_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_amount?: number
          description?: string | null
          id?: string
          image_id?: string | null
          submission_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      enhancements: {
        Row: {
          created_at: string
          credits_used: number
          enhanced_image_url: string | null
          error_message: string | null
          id: string
          is_favorite: boolean | null
          original_image_url: string
          preset_used: string
          replicate_prediction_id: string | null
          saved_to_gallery: boolean | null
          status: string
          toggles_used: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_used?: number
          enhanced_image_url?: string | null
          error_message?: string | null
          id?: string
          is_favorite?: boolean | null
          original_image_url: string
          preset_used: string
          replicate_prediction_id?: string | null
          saved_to_gallery?: boolean | null
          status?: string
          toggles_used?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_used?: number
          enhanced_image_url?: string | null
          error_message?: string | null
          id?: string
          is_favorite?: boolean | null
          original_image_url?: string
          preset_used?: string
          replicate_prediction_id?: string | null
          saved_to_gallery?: boolean | null
          status?: string
          toggles_used?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          consultations_monthly: number | null
          credits_monthly: number
          features: Json | null
          id: string
          is_popular: boolean | null
          name: string
          price_annual: number
          price_monthly: number
          sort_order: number | null
        }
        Insert: {
          consultations_monthly?: number | null
          credits_monthly: number
          features?: Json | null
          id: string
          is_popular?: boolean | null
          name: string
          price_annual: number
          price_monthly: number
          sort_order?: number | null
        }
        Update: {
          consultations_monthly?: number | null
          credits_monthly?: number
          features?: Json | null
          id?: string
          is_popular?: boolean | null
          name?: string
          price_annual?: number
          price_monthly?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          credits_balance: number
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_balance?: number
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_balance?: number
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          credits_awarded: boolean
          id: string
          referral_code: string
          referred_user_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          credits_awarded?: boolean
          id?: string
          referral_code: string
          referred_user_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          credits_awarded?: boolean
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          additional_notes: string | null
          after_photo_paths: string[] | null
          before_photo_paths: string[] | null
          build_type: string | null
          business_name: string
          created_at: string
          email: string
          full_name: string
          generated_before_image_path: string | null
          generated_video_prompt: string | null
          id: string
          is_public: boolean | null
          output_video_path: string | null
          output_video_url: string | null
          phone: string | null
          progress_photo_paths: string[] | null
          project_description: string
          prompt_error: string | null
          prompt_status: string
          scene_analysis_prompt: string | null
          share_views: number | null
          status: string
          target_platform: string[] | null
          transformation_category: string | null
          transformation_type: string
          user_id: string | null
          video_style: string
          video_type: string | null
        }
        Insert: {
          additional_notes?: string | null
          after_photo_paths?: string[] | null
          before_photo_paths?: string[] | null
          build_type?: string | null
          business_name: string
          created_at?: string
          email: string
          full_name: string
          generated_before_image_path?: string | null
          generated_video_prompt?: string | null
          id?: string
          is_public?: boolean | null
          output_video_path?: string | null
          output_video_url?: string | null
          phone?: string | null
          progress_photo_paths?: string[] | null
          project_description: string
          prompt_error?: string | null
          prompt_status?: string
          scene_analysis_prompt?: string | null
          share_views?: number | null
          status?: string
          target_platform?: string[] | null
          transformation_category?: string | null
          transformation_type: string
          user_id?: string | null
          video_style: string
          video_type?: string | null
        }
        Update: {
          additional_notes?: string | null
          after_photo_paths?: string[] | null
          before_photo_paths?: string[] | null
          build_type?: string | null
          business_name?: string
          created_at?: string
          email?: string
          full_name?: string
          generated_before_image_path?: string | null
          generated_video_prompt?: string | null
          id?: string
          is_public?: boolean | null
          output_video_path?: string | null
          output_video_url?: string | null
          phone?: string | null
          progress_photo_paths?: string[] | null
          project_description?: string
          prompt_error?: string | null
          prompt_status?: string
          scene_analysis_prompt?: string | null
          share_views?: number | null
          status?: string
          target_platform?: string[] | null
          transformation_category?: string | null
          transformation_type?: string
          user_id?: string | null
          video_style?: string
          video_type?: string | null
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string | null
          credits: number
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits?: number
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits?: number
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_cycle: string | null
          created_at: string | null
          credits_monthly_allowance: number | null
          credits_remaining: number | null
          credits_rollover: number | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
          website_consultations_limit: number | null
          website_consultations_used: number | null
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string | null
          credits_monthly_allowance?: number | null
          credits_remaining?: number | null
          credits_rollover?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
          website_consultations_limit?: number | null
          website_consultations_used?: number | null
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string | null
          credits_monthly_allowance?: number | null
          credits_remaining?: number | null
          credits_rollover?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
          website_consultations_limit?: number | null
          website_consultations_used?: number | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          aspect_ratio: string | null
          created_at: string
          credits_used: number | null
          duration: number | null
          error_message: string | null
          id: string
          is_favorite: boolean | null
          motion_style: string | null
          quality: string | null
          replicate_prediction_id: string | null
          source_enhancement_id: string | null
          source_image_url: string
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string
          credits_used?: number | null
          duration?: number | null
          error_message?: string | null
          id?: string
          is_favorite?: boolean | null
          motion_style?: string | null
          quality?: string | null
          replicate_prediction_id?: string | null
          source_enhancement_id?: string | null
          source_image_url: string
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string
          credits_used?: number | null
          duration?: number | null
          error_message?: string | null
          id?: string
          is_favorite?: boolean | null
          motion_style?: string | null
          quality?: string | null
          replicate_prediction_id?: string | null
          source_enhancement_id?: string | null
          source_image_url?: string
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_source_enhancement_id_fkey"
            columns: ["source_enhancement_id"]
            isOneToOne: false
            referencedRelation: "enhancements"
            referencedColumns: ["id"]
          },
        ]
      }
      website_consultations: {
        Row: {
          consultation_report: Json | null
          created_at: string | null
          id: string
          report_html: string | null
          status: string | null
          user_id: string
          website_url: string
        }
        Insert: {
          consultation_report?: Json | null
          created_at?: string | null
          id?: string
          report_html?: string | null
          status?: string | null
          user_id: string
          website_url: string
        }
        Update: {
          consultation_report?: Json | null
          created_at?: string | null
          id?: string
          report_html?: string | null
          status?: string | null
          user_id?: string
          website_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_or_create_referral_code: {
        Args: { p_user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
