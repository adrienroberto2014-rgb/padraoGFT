import { Graduation } from '../../core/entities/Graduation';

export interface IGraduationRepository {
  getAll(): Promise<Graduation[]>;
  getById(id: string): Promise<Graduation | null>;
  create(graduation: Omit<Graduation, 'id'>): Promise<string>;
  update(id: string, graduation: Partial<Graduation>): Promise<void>;
  save(graduation: Partial<Graduation>): Promise<string>;
  delete(id: string): Promise<void>;
  subscribeByStudentId(studentId: string, callback: (graduations: Graduation[]) => void): () => void;
}
