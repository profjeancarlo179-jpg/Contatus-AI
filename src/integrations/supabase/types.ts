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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audits: {
        Row: {
          bio: string | null
          created_at: string
          followers: number | null
          handle: string
          id: string
          niche: string | null
          notes: string | null
          result: Json | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          followers?: number | null
          handle: string
          id?: string
          niche?: string | null
          notes?: string | null
          result?: Json | null
          user_id?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          followers?: number | null
          handle?: string
          id?: string
          niche?: string | null
          notes?: string | null
          result?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      contents: {
        Row: {
          art_approved: boolean | null
          audio: string | null
          auto_approved: boolean
          batch_id: string | null
          batch_label: string | null
          caption: string
          caption_approved: boolean | null
          client_email: string | null
          client_name: string | null
          created_at: string
          day_number: number | null
          decided_at: string | null
          expires_at: string | null
          feedback: string | null
          format: string
          hashtags: string
          id: string
          image_urls: string[]
          kind: string
          location: string | null
          rejection_reasons: string[]
          sent_at: string | null
          share_token: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          art_approved?: boolean | null
          audio?: string | null
          auto_approved?: boolean
          batch_id?: string | null
          batch_label?: string | null
          caption?: string
          caption_approved?: boolean | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          day_number?: number | null
          decided_at?: string | null
          expires_at?: string | null
          feedback?: string | null
          format?: string
          hashtags?: string
          id?: string
          image_urls?: string[]
          kind?: string
          location?: string | null
          rejection_reasons?: string[]
          sent_at?: string | null
          share_token?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          art_approved?: boolean | null
          audio?: string | null
          auto_approved?: boolean
          batch_id?: string | null
          batch_label?: string | null
          caption?: string
          caption_approved?: boolean | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          day_number?: number | null
          decided_at?: string | null
          expires_at?: string | null
          feedback?: string | null
          format?: string
          hashtags?: string
          id?: string
          image_urls?: string[]
          kind?: string
          location?: string | null
          rejection_reasons?: string[]
          sent_at?: string | null
          share_token?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agency_name: string | null
          approved: boolean
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          agency_name?: string | null
          approved?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          agency_name?: string | null
          approved?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_approve_expired: { Args: never; Returns: undefined }
      get_shared_content: {
        Args: { _token: string }
        Returns: {
          agency_name: string
          audio: string
          auto_approved: boolean
          caption: string
          client_name: string
          expires_at: string
          format: string
          hashtags: string
          id: string
          image_urls: string[]
          kind: string
          location: string
          status: string
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      submit_decision: {
        Args: {
          _approved: boolean
          _feedback: string
          _reasons: string[]
          _token: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "master" | "client"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user", "master", "client"],
    },
  },
} as const
