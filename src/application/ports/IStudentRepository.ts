import { Student, StudentFilters } from '../../core/entities/Student';

export interface IStudentRepository {
  getAllStudents(filters?: StudentFilters): Promise<Student[]>;
  getById(id: string): Promise<Student | null>;
  save(student: Partial<Student>): Promise<string>;
  delete(id: string): Promise<void>;
  subscribeStudents(callback: (students: Student[]) => void, filters?: StudentFilters): () => void;
}
