import { IStudentRepository } from '../ports/IStudentRepository';
import { Student } from '../../core/entities/Student';
import { Timestamp } from 'firebase/firestore';

export class StudentService {
  constructor(private repository: IStudentRepository) {}

  async enrollStudent(studentData: Partial<Student>): Promise<string> {
    // Business rule: All students start with joinDate
    const newStudent = {
      ...studentData,
      status: 'Active' as const,
      joinDate: Timestamp.now(),
    };
    
    return await this.repository.save(newStudent);
  }

  async graduateStudent(studentId: string, belt: string, stripes: number, instructor: string): Promise<void> {
    // Logic for graduation
    await this.repository.save({
      id: studentId,
      belt,
      stripes,
      updatedAt: Timestamp.now()
    });
    
    // Here we could also trigger other repositories to save history
    console.log(`Student ${studentId} graduated to ${belt} by ${instructor}`);
  }
}
