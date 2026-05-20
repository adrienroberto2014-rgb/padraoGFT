export interface IClass {
  id?: string;
  title: string;
  instructorIds: string[];
  categories: string[];
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  capacity: number;
  checkInOffset: number;
  isRecurring: boolean;
  recurrenceWeeks?: number;
  modality: string;
  date?: any;
  dayOfWeek?: string;
  recurrenceId?: string;
  instanceId?: string;
  weekOffset?: number;
  presence?: string[];
  attendees?: string[];
  updatedAt?: any;
  createdAt?: any;
}

export interface IClassRepository {
  findAll(): Promise<IClass[]>;
  add(classData: Omit<IClass, 'id'>): Promise<string>;
  addBulk(classes: Omit<IClass, 'id'>[]): Promise<void>;
  update(id: string, classData: Partial<IClass>): Promise<void>;
  updateBulk(updates: { id: string, data: Partial<IClass> }[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteBulk(ids: string[]): Promise<void>;
  subscribe(callback: (data: IClass[]) => void): () => void;
}
