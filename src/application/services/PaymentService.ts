import { IPaymentRepository } from '../ports/IPaymentRepository';
import { Payment } from '../../core/entities/Payment';
import { Timestamp, doc, updateDoc } from 'firebase/firestore';

export class PaymentService {
  constructor(
    private repository: IPaymentRepository,
    private db: any
  ) {}

  async processPayment(paymentData: Partial<Payment>): Promise<string> {
    const payment = {
      ...paymentData,
      status: 'Paid' as const,
      date: paymentData.date || Timestamp.now(),
      createdAt: Timestamp.now()
    };
    return await this.repository.save(payment);
  }

  async processMensalidade(paymentData: any, student: any, durationMonths: number): Promise<void> {
    // 1. Save payment
    await this.processPayment({
      ...paymentData,
      type: 'mensalidade',
      status: 'Paid'
    });

    // 2. Update Student next payment date
    const currentNextDate = student.nextPaymentDate?.toDate() || new Date();
    const newNextDate = new Date(currentNextDate);
    newNextDate.setMonth(newNextDate.getMonth() + (durationMonths || 1));

    await updateDoc(doc(this.db, 'students', student.id), {
      lastPaymentDate: paymentData.date || Timestamp.now(),
      nextPaymentDate: Timestamp.fromDate(newNextDate)
    });
  }

  async getStudentPayments(studentId: string): Promise<Payment[]> {
    return await this.repository.getByStudentId(studentId);
  }
}
