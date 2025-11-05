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
      profiles: {
        Row: {
          id: string
          role: 'student' | 'professor' | 'institution'
          full_name: string
          registration_number: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: 'student' | 'professor' | 'institution'
          full_name: string
          registration_number: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'student' | 'professor' | 'institution'
          full_name?: string
          registration_number?: string
          created_at?: string
          updated_at?: string
        }
      }
      institutions: {
        Row: {
          id: string
          name: string
          address: string | null
          admin_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          admin_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          admin_id?: string | null
          created_at?: string
        }
      }
      classes: {
        Row: {
          id: string
          institution_id: string | null
          professor_id: string | null
          name: string
          code: string
          schedule: Json
          location: string | null
          latitude: number | null
          longitude: number | null
          geofence_radius: number
          created_at: string
        }
        Insert: {
          id?: string
          institution_id?: string | null
          professor_id?: string | null
          name: string
          code: string
          schedule?: Json
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          geofence_radius?: number
          created_at?: string
        }
        Update: {
          id?: string
          institution_id?: string | null
          professor_id?: string | null
          name?: string
          code?: string
          schedule?: Json
          location?: string | null
          latitude?: number | null
          longitude?: number | null
          geofence_radius?: number
          created_at?: string
        }
      }
      class_enrollments: {
        Row: {
          id: string
          class_id: string | null
          student_id: string | null
          enrolled_at: string
        }
        Insert: {
          id?: string
          class_id?: string | null
          student_id?: string | null
          enrolled_at?: string
        }
        Update: {
          id?: string
          class_id?: string | null
          student_id?: string | null
          enrolled_at?: string
        }
      }
      attendance_sessions: {
        Row: {
          id: string
          class_id: string | null
          professor_id: string | null
          qr_token: string | null
          qr_expires_at: string | null
          session_date: string
          started_at: string
          ended_at: string | null
          mode: 'professor_generates' | 'student_presents'
          require_geolocation: boolean
        }
        Insert: {
          id?: string
          class_id?: string | null
          professor_id?: string | null
          qr_token?: string | null
          qr_expires_at?: string | null
          session_date?: string
          started_at?: string
          ended_at?: string | null
          mode: 'professor_generates' | 'student_presents'
          require_geolocation?: boolean
        }
        Update: {
          id?: string
          class_id?: string | null
          professor_id?: string | null
          qr_token?: string | null
          qr_expires_at?: string | null
          session_date?: string
          started_at?: string
          ended_at?: string | null
          mode?: 'professor_generates' | 'student_presents'
          require_geolocation?: boolean
        }
      }
      attendance_records: {
        Row: {
          id: string
          session_id: string | null
          student_id: string | null
          marked_at: string
          method: 'qr_scan' | 'manual'
          latitude: number | null
          longitude: number | null
          synced: boolean
          synced_at: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          student_id?: string | null
          marked_at?: string
          method: 'qr_scan' | 'manual'
          latitude?: number | null
          longitude?: number | null
          synced?: boolean
          synced_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          student_id?: string | null
          marked_at?: string
          method?: 'qr_scan' | 'manual'
          latitude?: number | null
          longitude?: number | null
          synced?: boolean
          synced_at?: string | null
        }
      }
      offline_queue: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          data: Json
          created_at: string
          synced: boolean
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          data: Json
          created_at?: string
          synced?: boolean
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          data?: Json
          created_at?: string
          synced?: boolean
        }
      }
    }
  }
}
