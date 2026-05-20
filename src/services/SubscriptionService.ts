import { doc, collection, addDoc, updateDoc, Timestamp, query, where, getDocs, Firestore } from 'firebase/firestore';
import { Subscription, SubscriptionStatus } from '../core/entities/Subscription';
import { Invoice, InvoiceStatus } from '../core/entities/Invoice';
import { Student } from '../core/entities/Student';
import { Plan } from '../core/entities/Plan';

export class SubscriptionService {
  constructor(private db: Firestore, private tenantId: string) {}

  /**
   * Enrolls a student in a recurring plan
   */
  async createSubscription(student: Student, plan: Plan): Promise<string> {
    const now = Timestamp.now();
    const periodEnd = this.calculateNextDueDate(now.toDate(), plan.durationMonths || 1);

    const subscription: Partial<Subscription> = {
      studentId: student.id,
      studentName: student.name,
      planId: plan.id,
      planName: plan.name,
      status: 'active',
      amount: plan.price,
      currency: 'BRL', // Default
      billingCycle: this.mapDurationToCycle(plan.durationMonths || 1),
      currentPeriodStart: now,
      currentPeriodEnd: Timestamp.fromDate(periodEnd),
      cancelAtPeriodEnd: false,
      createdAt: now,
      tenantId: this.tenantId
    };

    const subRef = await addDoc(collection(this.db, 'subscriptions'), subscription);
    
    // Create first invoice
    await this.createInvoice({
      studentId: student.id,
      studentName: student.name,
      subscriptionId: subRef.id,
      amount: plan.price,
      dueDate: now, // First payment due immediately
      status: 'pending',
      items: [{ description: `Monthly Fee - ${plan.name}`, amount: plan.price }],
      periodStart: now,
      periodEnd: Timestamp.fromDate(periodEnd)
    });

    return subRef.id;
  }

  /**
   * Processes a payment for an invoice
   */
  async markInvoiceAsPaid(invoiceId: string, paymentMethod: string): Promise<void> {
    const now = Timestamp.now();
    const invoiceRef = doc(this.db, 'invoices', invoiceId);
    
    await updateDoc(invoiceRef, {
      status: 'paid',
      paidAt: now,
      paymentMethod
    });

    // Also update student record for quick lookup (denormalization)
    // In a full SaaS, we'd also trigger events here
  }

  /**
   * Redesign: Automation Hook
   * This would typically run in a serverless function (Cron Job)
   */
  async checkOverdueInvoices(): Promise<void> {
    const now = Timestamp.now();
    const q = query(
      collection(this.db, 'invoices'), 
      where('status', '==', 'pending'),
      where('dueDate', '<', now),
      where('tenantId', '==', this.tenantId)
    );

    const snapshot = await getDocs(q);
    const promises = snapshot.docs.map(docSnap => {
      const invoice = docSnap.data() as Invoice;
      return updateDoc(doc(this.db, 'invoices', docSnap.id), { status: 'overdue' });
      // Logic would also block student access if needed
    });

    await Promise.all(promises);
  }

  private calculateNextDueDate(startDate: Date, months: number): Date {
    const copy = new Date(startDate);
    copy.setMonth(copy.getMonth() + months);
    return copy;
  }

  private mapDurationToCycle(months: number): any {
    if (months === 1) return 'Monthly';
    if (months === 3) return 'Quarterly';
    if (months === 6) return 'Semiannual';
    if (months === 12) return 'Yearly';
    return 'Monthly';
  }

  private async createInvoice(invoice: Partial<Invoice>): Promise<string> {
    const ref = await addDoc(collection(this.db, 'invoices'), {
      ...invoice,
      createdAt: Timestamp.now(),
      tenantId: this.tenantId
    });
    return ref.id;
  }
}
