export interface CheckIn {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  time: any; // Firestore Timestamp
  type: string; // 'manual' | 'qr' | etc.
  modality?: string;
  source?: string;
  isGympass?: boolean;
  tenantId: string;
}

export interface CheckInFilters {
  studentId?: string;
  studentIds?: string[];
  classId?: string;
  limit?: number;
}
