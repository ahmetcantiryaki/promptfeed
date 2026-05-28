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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      follows: {
        Row: {
          created_at: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      models: {
        Row: {
          created_at: string
          icon_url: string | null
          name: string
          post_count: number
          slug: string
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          name: string
          post_count?: number
          slug: string
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          name?: string
          post_count?: number
          slug?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_handle: string | null
          created_at: string
          data: Json | null
          id: string
          post_id: string | null
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_handle?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          post_id?: string | null
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_handle?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          post_id?: string | null
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      platforms: {
        Row: {
          created_at: string
          icon_url: string | null
          name: string
          post_count: number
          slug: string
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          name: string
          post_count?: number
          slug: string
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          name?: string
          post_count?: number
          slug?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          created_at: string
          folder_id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "save_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          created_at: string
          post_id: string
          tag_slug: string
        }
        Insert: {
          created_at?: string
          post_id: string
          tag_slug: string
        }
        Update: {
          created_at?: string
          post_id?: string
          tag_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_slug_fkey"
            columns: ["tag_slug"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["slug"]
          },
        ]
      }
      post_view_dedupe: {
        Row: {
          post_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          post_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          post_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_view_dedupe_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments: number
          created_at: string
          external_creator_handle: string | null
          external_creator_platform: string | null
          external_creator_url: string | null
          extra_image_urls: string[]
          id: string
          likes: number
          media_type: string
          media_url: string
          model_slug: string
          owner_id: string | null
          platform_slug: string
          posted_at: string
          prompt: string
          prompt_type: string
          scraped_at: string
          shares: number
          slug: string
          source_image_url: string | null
          source_url: string
          source_user: string
          thumbnail_url: string | null
          title: string
          views: number
        }
        Insert: {
          comments?: number
          created_at?: string
          external_creator_handle?: string | null
          external_creator_platform?: string | null
          external_creator_url?: string | null
          extra_image_urls?: string[]
          id?: string
          likes?: number
          media_type: string
          media_url: string
          model_slug: string
          owner_id?: string | null
          platform_slug: string
          posted_at: string
          prompt: string
          prompt_type?: string
          scraped_at?: string
          shares?: number
          slug: string
          source_image_url?: string | null
          source_url: string
          source_user: string
          thumbnail_url?: string | null
          title: string
          views?: number
        }
        Update: {
          comments?: number
          created_at?: string
          external_creator_handle?: string | null
          external_creator_platform?: string | null
          external_creator_url?: string | null
          extra_image_urls?: string[]
          id?: string
          likes?: number
          media_type?: string
          media_url?: string
          model_slug?: string
          owner_id?: string | null
          platform_slug?: string
          posted_at?: string
          prompt?: string
          prompt_type?: string
          scraped_at?: string
          shares?: number
          slug?: string
          source_image_url?: string | null
          source_url?: string
          source_user?: string
          thumbnail_url?: string | null
          title?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_model_slug_fkey"
            columns: ["model_slug"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "posts_platform_slug_fkey"
            columns: ["platform_slug"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["slug"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_config: Json | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          handle: string | null
          id: string
          is_admin: boolean
          is_banned: boolean
          is_verified: boolean
          updated_at: string
        }
        Insert: {
          avatar_config?: Json | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id: string
          is_admin?: boolean
          is_banned?: boolean
          is_verified?: boolean
          updated_at?: string
        }
        Update: {
          avatar_config?: Json | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          is_admin?: boolean
          is_banned?: boolean
          is_verified?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reason: string | null
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reason?: string | null
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reason?: string | null
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      save_folders: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          created_at: string
          handle: string
          id: string
          platform: string
          profile_id: string
          url: string | null
        }
        Insert: {
          created_at?: string
          handle: string
          id?: string
          platform: string
          profile_id: string
          url?: string | null
        }
        Update: {
          created_at?: string
          handle?: string
          id?: string
          platform?: string
          profile_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          axis: string
          created_at: string
          display_order: number
          name: string
          post_count: number
          slug: string
        }
        Insert: {
          axis: string
          created_at?: string
          display_order?: number
          name: string
          post_count?: number
          slug: string
        }
        Update: {
          axis?: string
          created_at?: string
          display_order?: number
          name?: string
          post_count?: number
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_save_folder: {
        Args: { folder_name: string; make_default?: boolean }
        Returns: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "save_folders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      derive_title_from_prompt: {
        Args: { input: string; max_len?: number }
        Returns: string
      }
      increment_post_views: { Args: { p_post_id: string }; Returns: undefined }
      is_admin: { Args: { uid: string }; Returns: boolean }
      record_post_view: {
        Args: { p_post_id: string; p_viewer_id: string }
        Returns: boolean
      }
      set_default_save_folder: {
        Args: { target_folder_id: string }
        Returns: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "save_folders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      slugify_text: {
        Args: { input: string; max_len?: number }
        Returns: string
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
