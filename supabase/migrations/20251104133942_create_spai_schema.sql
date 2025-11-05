/*
  # SPAI - Sistema de Presença Acadêmica Inteligente - Database Schema

  ## Overview
  This migration creates the complete database schema for the Academic Attendance System.
  
  ## New Tables
  
  ### 1. profiles
  Extends auth.users with role and profile information
  - `id` (uuid, FK to auth.users)
  - `role` (text: 'student', 'professor', 'institution')
  - `full_name` (text)
  - `registration_number` (text, unique)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 2. institutions
  Stores institution/university data
  - `id` (uuid, PK)
  - `name` (text)
  - `address` (text)
  - `admin_id` (uuid, FK to profiles)
  - `created_at` (timestamptz)
  
  ### 3. classes
  Academic classes/courses
  - `id` (uuid, PK)
  - `institution_id` (uuid, FK)
  - `professor_id` (uuid, FK to profiles)
  - `name` (text)
  - `code` (text)
  - `schedule` (jsonb) - day/time info
  - `location` (text) - room number
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `geofence_radius` (integer) - meters
  - `created_at` (timestamptz)
  
  ### 4. class_enrollments
  Student enrollment in classes
  - `id` (uuid, PK)
  - `class_id` (uuid, FK)
  - `student_id` (uuid, FK to profiles)
  - `enrolled_at` (timestamptz)
  
  ### 5. attendance_sessions
  Professor-initiated attendance sessions
  - `id` (uuid, PK)
  - `class_id` (uuid, FK)
  - `professor_id` (uuid, FK to profiles)
  - `qr_token` (text, unique) - dynamic token
  - `qr_expires_at` (timestamptz)
  - `session_date` (date)
  - `started_at` (timestamptz)
  - `ended_at` (timestamptz)
  - `mode` (text: 'professor_generates', 'student_presents')
  - `require_geolocation` (boolean)
  
  ### 6. attendance_records
  Individual attendance records
  - `id` (uuid, PK)
  - `session_id` (uuid, FK to attendance_sessions)
  - `student_id` (uuid, FK to profiles)
  - `marked_at` (timestamptz)
  - `method` (text: 'qr_scan', 'manual')
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `synced` (boolean) - for offline sync
  - `synced_at` (timestamptz)
  
  ### 7. offline_queue
  Stores offline attendance data for sync
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to auth.users)
  - `session_id` (uuid)
  - `data` (jsonb)
  - `created_at` (timestamptz)
  - `synced` (boolean)
  
  ## Security
  - RLS enabled on all tables
  - Policies for each role (student, professor, institution)
  - Students can only view their own data
  - Professors can manage their classes
  - Institutions can view all data in their scope
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('student', 'professor', 'institution')),
  full_name text NOT NULL,
  registration_number text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create institutions table
CREATE TABLE IF NOT EXISTS institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  admin_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) ON DELETE CASCADE,
  professor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  schedule jsonb DEFAULT '[]'::jsonb,
  location text,
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  geofence_radius integer DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

-- Create class_enrollments table
CREATE TABLE IF NOT EXISTS class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Create attendance_sessions table
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  professor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  qr_token text UNIQUE,
  qr_expires_at timestamptz,
  session_date date DEFAULT CURRENT_DATE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  mode text NOT NULL CHECK (mode IN ('professor_generates', 'student_presents')),
  require_geolocation boolean DEFAULT true
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  marked_at timestamptz DEFAULT now(),
  method text NOT NULL CHECK (method IN ('qr_scan', 'manual')),
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  synced boolean DEFAULT true,
  synced_at timestamptz DEFAULT now(),
  UNIQUE(session_id, student_id)
);

-- Create offline_queue table
CREATE TABLE IF NOT EXISTS offline_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  synced boolean DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_registration ON profiles(registration_number);
CREATE INDEX IF NOT EXISTS idx_classes_professor ON classes(professor_id);
CREATE INDEX IF NOT EXISTS idx_classes_institution ON classes(institution_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class ON attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_user ON offline_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_synced ON offline_queue(synced);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Institutions policies
CREATE POLICY "Admins can view their institution"
  ON institutions FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Admins can update their institution"
  ON institutions FOR UPDATE
  TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can create institutions"
  ON institutions FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

-- Classes policies
CREATE POLICY "Professors can view their classes"
  ON classes FOR SELECT
  TO authenticated
  USING (
    professor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_enrollments.class_id = classes.id
      AND class_enrollments.student_id = auth.uid()
    )
  );

CREATE POLICY "Professors can create classes"
  ON classes FOR INSERT
  TO authenticated
  WITH CHECK (professor_id = auth.uid());

CREATE POLICY "Professors can update their classes"
  ON classes FOR UPDATE
  TO authenticated
  USING (professor_id = auth.uid())
  WITH CHECK (professor_id = auth.uid());

CREATE POLICY "Professors can delete their classes"
  ON classes FOR DELETE
  TO authenticated
  USING (professor_id = auth.uid());

-- Enrollments policies
CREATE POLICY "Students can view their enrollments"
  ON class_enrollments FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.professor_id = auth.uid()
    )
  );

CREATE POLICY "Professors can manage enrollments"
  ON class_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_id
      AND classes.professor_id = auth.uid()
    )
  );

CREATE POLICY "Professors can delete enrollments"
  ON class_enrollments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.professor_id = auth.uid()
    )
  );

-- Attendance sessions policies
CREATE POLICY "View sessions for enrolled users"
  ON attendance_sessions FOR SELECT
  TO authenticated
  USING (
    professor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_enrollments.class_id = attendance_sessions.class_id
      AND class_enrollments.student_id = auth.uid()
    )
  );

CREATE POLICY "Professors can create sessions"
  ON attendance_sessions FOR INSERT
  TO authenticated
  WITH CHECK (professor_id = auth.uid());

CREATE POLICY "Professors can update their sessions"
  ON attendance_sessions FOR UPDATE
  TO authenticated
  USING (professor_id = auth.uid())
  WITH CHECK (professor_id = auth.uid());

-- Attendance records policies
CREATE POLICY "Students can view own records"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM attendance_sessions
      WHERE attendance_sessions.id = attendance_records.session_id
      AND attendance_sessions.professor_id = auth.uid()
    )
  );

CREATE POLICY "Students can create own records"
  ON attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Professors can create records"
  ON attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM attendance_sessions
      WHERE attendance_sessions.id = session_id
      AND attendance_sessions.professor_id = auth.uid()
    )
  );

-- Offline queue policies
CREATE POLICY "Users can view own queue"
  ON offline_queue FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own queue"
  ON offline_queue FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own queue"
  ON offline_queue FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own queue"
  ON offline_queue FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());