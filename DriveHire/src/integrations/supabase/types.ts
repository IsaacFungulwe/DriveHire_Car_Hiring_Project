export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          detail: string | null;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          detail?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          detail?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      booking_events: {
        Row: {
          booking_id: string;
          created_at: string;
          id: string;
          label: string;
          note: string | null;
        };
        Insert: {
          booking_id: string;
          created_at?: string;
          id?: string;
          label: string;
          note?: string | null;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          id?: string;
          label?: string;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          company_id: string;
          created_at: string;
          customer_id: string;
          days: number;
          delivery_fee: number;
          deposit: number;
          extras: string[];
          extras_total: number;
          id: string;
          insurance_total: number;
          payment_status: string;
          pickup_at: string;
          pickup_location: string;
          reference: string;
          rental_total: number;
          return_at: string;
          return_location: string;
          status: string;
          tax: number;
          terms_accepted: boolean;
          total: number;
          vehicle_id: string;
          verify_token: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          customer_id: string;
          days: number;
          delivery_fee?: number;
          deposit?: number;
          extras?: string[];
          extras_total?: number;
          id?: string;
          insurance_total?: number;
          payment_status?: string;
          pickup_at: string;
          pickup_location: string;
          reference: string;
          rental_total: number;
          return_at: string;
          return_location: string;
          status?: string;
          tax?: number;
          terms_accepted?: boolean;
          total: number;
          vehicle_id: string;
          verify_token?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          customer_id?: string;
          days?: number;
          delivery_fee?: number;
          deposit?: number;
          extras?: string[];
          extras_total?: number;
          id?: string;
          insurance_total?: number;
          payment_status?: string;
          pickup_at?: string;
          pickup_location?: string;
          reference?: string;
          rental_total?: number;
          return_at?: string;
          return_location?: string;
          status?: string;
          tax?: number;
          terms_accepted?: boolean;
          total?: number;
          vehicle_id?: string;
          verify_token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          address: string | null;
          city: string;
          created_at: string;
          description: string | null;
          email: string | null;
          id: string;
          is_suspended: boolean;
          is_verified: boolean;
          name: string;
          owner_id: string | null;
          phone: string | null;
        };
        Insert: {
          address?: string | null;
          city?: string;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          is_suspended?: boolean;
          is_verified?: boolean;
          name: string;
          owner_id?: string | null;
          phone?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          is_suspended?: boolean;
          is_verified?: boolean;
          name?: string;
          owner_id?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
          created_at: string;
          id: string;
          user_id: string;
          vehicle_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          booking_id: string;
          created_at: string;
          id: string;
          is_read: boolean;
          sender_id: string;
        };
        Insert: {
          body: string;
          booking_id: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          sender_id: string;
        };
        Update: {
          body?: string;
          booking_id?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          category: string;
          created_at: string;
          id: string;
          is_read: boolean;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_suspended: boolean;
          is_verified: boolean;
          notify_bookings: boolean;
          notify_promos: boolean;
          phone: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id: string;
          is_suspended?: boolean;
          is_verified?: boolean;
          notify_bookings?: boolean;
          notify_promos?: boolean;
          phone?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          is_suspended?: boolean;
          is_verified?: boolean;
          notify_bookings?: boolean;
          notify_promos?: boolean;
          phone?: string | null;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          booking_id: string;
          comment: string | null;
          company_rating: number | null;
          created_at: string;
          customer_id: string;
          id: string;
          is_hidden: boolean;
          rating: number;
          vehicle_id: string;
        };
        Insert: {
          booking_id: string;
          comment?: string | null;
          company_rating?: number | null;
          created_at?: string;
          customer_id: string;
          id?: string;
          is_hidden?: boolean;
          rating: number;
          vehicle_id: string;
        };
        Update: {
          booking_id?: string;
          comment?: string | null;
          company_rating?: number | null;
          created_at?: string;
          customer_id?: string;
          id?: string;
          is_hidden?: boolean;
          rating?: number;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          brand: string;
          cancellation_policy: string;
          city: string;
          company_id: string;
          condition_note: string | null;
          created_at: string;
          deposit: number;
          description: string | null;
          doors: number;
          features: string[];
          fuel_type: string;
          id: string;
          image_key: string | null;
          image_path: string | null;
          inspection_status: string;
          is_available: boolean;
          last_maintenance: string | null;
          mileage: number;
          mileage_policy: string;
          model: string;
          next_maintenance: string | null;
          pickup_address: string | null;
          price_per_day: number;
          rating: number;
          review_count: number;
          seats: number;
          status: string;
          transmission: string;
          vehicle_type: string;
          year: number;
        };
        Insert: {
          brand: string;
          cancellation_policy?: string;
          city?: string;
          company_id: string;
          condition_note?: string | null;
          created_at?: string;
          deposit?: number;
          description?: string | null;
          doors?: number;
          features?: string[];
          fuel_type?: string;
          id?: string;
          image_key?: string | null;
          image_path?: string | null;
          inspection_status?: string;
          is_available?: boolean;
          last_maintenance?: string | null;
          mileage?: number;
          mileage_policy?: string;
          model: string;
          next_maintenance?: string | null;
          pickup_address?: string | null;
          price_per_day: number;
          rating?: number;
          review_count?: number;
          seats?: number;
          status?: string;
          transmission?: string;
          vehicle_type?: string;
          year: number;
        };
        Update: {
          brand?: string;
          cancellation_policy?: string;
          city?: string;
          company_id?: string;
          condition_note?: string | null;
          created_at?: string;
          deposit?: number;
          description?: string | null;
          doors?: number;
          features?: string[];
          fuel_type?: string;
          id?: string;
          image_key?: string | null;
          image_path?: string | null;
          inspection_status?: string;
          is_available?: boolean;
          last_maintenance?: string | null;
          mileage?: number;
          mileage_policy?: string;
          model?: string;
          next_maintenance?: string | null;
          pickup_address?: string | null;
          price_per_day?: number;
          rating?: number;
          review_count?: number;
          seats?: number;
          status?: string;
          transmission?: string;
          vehicle_type?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_booking: {
        Args: {
          p_extras: string[];
          p_pickup_at: string;
          p_pickup_location: string;
          p_return_at: string;
          p_return_location: string;
          p_terms_accepted: boolean;
          p_vehicle_id: string;
        };
        Returns: {
          company_id: string;
          created_at: string;
          customer_id: string;
          days: number;
          delivery_fee: number;
          deposit: number;
          extras: string[];
          extras_total: number;
          id: string;
          insurance_total: number;
          payment_status: string;
          pickup_at: string;
          pickup_location: string;
          reference: string;
          rental_total: number;
          return_at: string;
          return_location: string;
          status: string;
          tax: number;
          terms_accepted: boolean;
          total: number;
          vehicle_id: string;
          verify_token: string;
        };
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      set_booking_status: {
        Args: { p_booking_id: string; p_note?: string; p_status: string };
        Returns: {
          company_id: string;
          created_at: string;
          customer_id: string;
          days: number;
          delivery_fee: number;
          deposit: number;
          extras: string[];
          extras_total: number;
          id: string;
          insurance_total: number;
          payment_status: string;
          pickup_at: string;
          pickup_location: string;
          reference: string;
          rental_total: number;
          return_at: string;
          return_location: string;
          status: string;
          tax: number;
          terms_accepted: boolean;
          total: number;
          vehicle_id: string;
          verify_token: string;
        };
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      vehicle_is_free: {
        Args: { _from: string; _to: string; _vehicle_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "customer" | "owner" | "admin";
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "owner", "admin"],
    },
  },
} as const;
