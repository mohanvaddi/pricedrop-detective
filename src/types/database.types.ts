export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      prices: {
        Row: {
          created_at: string
          id: string
          price: number
          tracker: string
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          tracker: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          tracker?: string
        }
        Relationships: [
          {
            foreignKeyName: "prices_tracker_fkey"
            columns: ["tracker"]
            referencedRelation: "trackers"
            referencedColumns: ["id"]
          }
        ]
      }
      trackers: {
        Row: {
          created_at: string
          id: string
          url: string
          user: number
          website: string
        }
        Insert: {
          created_at?: string
          id: string
          url?: string
          user: number
          website?: string
        }
        Update: {
          created_at?: string
          id?: string
          url?: string
          user?: number
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "trackers_user_fkey"
            columns: ["user"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          created_at: string
          id: number
          username: string
        }
        Insert: {
          created_at?: string
          id: number
          username: string
        }
        Update: {
          created_at?: string
          id?: number
          username?: string
        }
        Relationships: []
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
