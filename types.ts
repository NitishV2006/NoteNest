export enum UserRole {
  STUDENT = 'student',
  FACULTY = 'faculty',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  mobile_number?: string;
  department_id?: string;
  department_name?: string;
  subject_taught?: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface Note {
  id: string;
  title: string;
  file_path: string;
  faculty_id: string;
  faculty_name?: string;
  department_id: string;
  department_name?: string;
  created_at: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}