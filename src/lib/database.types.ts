// Tipos de base de datos generados desde el esquema Supabase
// Compatibles con: supabase/migrations/001_initial_schema.sql
// Regenerar con: npx supabase gen types typescript --project-id <ref> --schema public > src/lib/database.types.ts

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
          name: string | null
          initial_weight_kg: number | null
          height_cm: number | null
          goal: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          initial_weight_kg?: number | null
          height_cm?: number | null
          goal?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          initial_weight_kg?: number | null
          height_cm?: number | null
          goal?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      targets: {
        Row: {
          user_id: string
          calories: number | null
          protein: number | null
          fat: number | null
          carbs: number | null
          carb_min: number | null
          carb_max: number | null
          updated_at: string
        }
        Insert: {
          user_id: string
          calories?: number | null
          protein?: number | null
          fat?: number | null
          carbs?: number | null
          carb_min?: number | null
          carb_max?: number | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          calories?: number | null
          protein?: number | null
          fat?: number | null
          carbs?: number | null
          carb_min?: number | null
          carb_max?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'targets_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      foods: {
        Row: {
          id: string
          user_id: string
          name: string
          brand: string | null
          category: string | null
          calories_per_100: number
          protein_per_100: number
          carbs_per_100: number
          fat_per_100: number
          fiber_per_100: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          brand?: string | null
          category?: string | null
          calories_per_100: number
          protein_per_100: number
          carbs_per_100: number
          fat_per_100: number
          fiber_per_100?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          brand?: string | null
          category?: string | null
          calories_per_100?: number
          protein_per_100?: number
          carbs_per_100?: number
          fat_per_100?: number
          fiber_per_100?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'foods_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      entries: {
        Row: {
          id: string
          user_id: string
          date: string
          meal: string
          food_id: string | null
          food_name: string
          brand: string | null
          grams: number
          calories_declared: number
          calories_estimated: number
          protein: number
          carbs: number
          fat: number
          fiber: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          meal: string
          food_id?: string | null
          food_name: string
          brand?: string | null
          grams: number
          calories_declared: number
          calories_estimated: number
          protein: number
          carbs: number
          fat: number
          fiber?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          meal?: string
          food_id?: string | null
          food_name?: string
          brand?: string | null
          grams?: number
          calories_declared?: number
          calories_estimated?: number
          protein?: number
          carbs?: number
          fat?: number
          fiber?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'entries_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'entries_food_id_fkey'
            columns: ['food_id']
            referencedRelation: 'foods'
            referencedColumns: ['id']
          },
        ]
      }
      exercises: {
        Row: {
          id: string
          user_id: string
          name: string
          muscle_group: string
          equipment: string | null
          notes: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          muscle_group: string
          equipment?: string | null
          notes?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          muscle_group?: string
          equipment?: string | null
          notes?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'exercises_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          date: string
          name: string
          status: string
          notes: string | null
          started_at: string | null
          finished_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          name: string
          status?: string
          notes?: string | null
          started_at?: string | null
          finished_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          name?: string
          status?: string
          notes?: string | null
          started_at?: string | null
          finished_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workouts_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          exercise_id: string | null
          exercise_name: string
          muscle_group: string
          order: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_id?: string | null
          exercise_name: string
          muscle_group: string
          order?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          exercise_id?: string | null
          exercise_name?: string
          muscle_group?: string
          order?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workout_exercises_workout_id_fkey'
            columns: ['workout_id']
            referencedRelation: 'workouts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_exercises_exercise_id_fkey'
            columns: ['exercise_id']
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
        ]
      }
      sets: {
        Row: {
          id: string
          workout_id: string
          workout_exercise_id: string
          set_number: number
          weight_kg: number
          reps: number
          rir: number | null
          is_warmup: boolean
          completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          workout_exercise_id: string
          set_number: number
          weight_kg?: number
          reps?: number
          rir?: number | null
          is_warmup?: boolean
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          workout_exercise_id?: string
          set_number?: number
          weight_kg?: number
          reps?: number
          rir?: number | null
          is_warmup?: boolean
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sets_workout_id_fkey'
            columns: ['workout_id']
            referencedRelation: 'workouts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sets_workout_exercise_id_fkey'
            columns: ['workout_exercise_id']
            referencedRelation: 'workout_exercises'
            referencedColumns: ['id']
          },
        ]
      }
      body_weights: {
        Row: {
          id: string
          user_id: string
          date: string
          weight_kg: number
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          weight_kg: number
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          weight_kg?: number
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'body_weights_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_preferences: {
        Row: {
          user_id: string
          theme: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          theme?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          theme?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_preferences_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      workout_summary: {
        Row: {
          id: string
          user_id: string
          date: string
          name: string
          status: string
          started_at: string | null
          finished_at: string | null
          exercise_count: number
          effective_sets: number
          warmup_sets: number
          pending_sets: number
          volume: number
          total_reps: number
        }
        Relationships: [
          {
            foreignKeyName: 'workouts_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      daily_nutrition_summary: {
        Row: {
          user_id: string
          date: string
          calories: number
          calories_estimated: number
          protein: number
          carbs: number
          fat: number
          fiber: number
          entries_count: number
        }
        Relationships: [
          {
            foreignKeyName: 'entries_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      assert_workout_ownership: {
        Args: { p_workout_id: string }
        Returns: boolean
      }
    }
    Enums: {
      // No hay enums nativos, usamos CHECK constraints
    }
    CompositeTypes: {
      // No hay tipos compuestos
    }
  }
}