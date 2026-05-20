import { CheckIn, CheckInFilters } from '../../core/entities/CheckIn';

export interface ICheckInRepository {
  getAll(filters?: CheckInFilters): Promise<CheckIn[]>;
  getById(id: string): Promise<CheckIn | null>;
  save(checkIn: Partial<CheckIn>): Promise<string>;
  delete(id: string): Promise<void>;
  subscribe(callback: (checkIns: CheckIn[]) => void, filters?: CheckInFilters): () => void;
  getByStudentId(studentId: string): Promise<CheckIn[]>;
}
