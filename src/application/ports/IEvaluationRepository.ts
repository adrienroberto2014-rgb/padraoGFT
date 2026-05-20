import { Evaluation } from '../../core/entities/Evaluation';

export interface IEvaluationRepository {
  getAll(): Promise<Evaluation[]>;
  getById(id: string): Promise<Evaluation | null>;
  create(evaluation: Omit<Evaluation, 'id'>): Promise<string>;
  update(id: string, evaluation: Partial<Evaluation>): Promise<void>;
  save(evaluation: Partial<Evaluation>): Promise<string>;
  delete(id: string): Promise<void>;
  subscribeByStudentId(studentId: string, callback: (evaluations: Evaluation[]) => void): () => void;
}
