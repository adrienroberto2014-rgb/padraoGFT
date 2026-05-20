import { ICheckInRepository } from '../ports/ICheckInRepository';
import { CheckIn } from '../../core/entities/CheckIn';
import { Timestamp, doc, updateDoc } from 'firebase/firestore';

export class CheckInService {
  constructor(
    private repository: ICheckInRepository,
    private db: any // Passing db for direct doc updates if needed, though better through a ClassRepository
  ) {}

  async registerCheckIn(checkInData: Partial<CheckIn>, classData: any): Promise<string> {
    const studentId = checkInData.studentId!;
    const classId = checkInData.classId!;

    // 1. Update Class presence
    const currentPresence = classData.presence || [];
    if (!currentPresence.includes(studentId)) {
      await updateDoc(doc(this.db, 'classes', classId), {
        presence: [...currentPresence, studentId]
      });
    }

    // 2. Create CheckIn record
    const checkIn = {
      ...checkInData,
      time: Timestamp.now(),
      type: checkInData.type || 'manual'
    };
    return await this.repository.save(checkIn);
  }

  async getStudentHistory(studentId: string): Promise<CheckIn[]> {
    return await this.repository.getByStudentId(studentId);
  }
}
