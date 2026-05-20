/**
 * Abstract Payment Gateway Service
 * This is the architecture for future Stripe/MercadoPago integrations
 */
export interface PaymentGateway {
  createCustomer(studentEmail: string, name: string): Promise<string>;
  createSubscription(customerId: string, planId: string): Promise<string>;
  processOneTimePayment(amount: number, methodId: string): Promise<{ success: boolean; transactionId: string }>;
  webhookHandler(payload: any): Promise<void>;
}

export class StripeGateway implements PaymentGateway {
  async createCustomer(email: string, name: string): Promise<string> {
    console.log('Stripe: Creating customer', email);
    return 'cus_stripe_mock_123';
  }

  async createSubscription(customerId: string, planId: string): Promise<string> {
    console.log('Stripe: Creating subscription');
    return 'sub_stripe_mock_123';
  }

  async processOneTimePayment(amount: number, methodId: string) {
    return { success: true, transactionId: 'txn_mock_123' };
  }

  async webhookHandler(payload: any) {
    // Handle status changes (paid, failed, canceled)
  }
}

export class MercadoPagoGateway implements PaymentGateway {
  async createCustomer(email: string, name: string): Promise<string> {
    console.log('MP: Creating customer');
    return 'mp_cust_mock_123';
  }

  async createSubscription(customerId: string, planId: string): Promise<string> {
    console.log('MP: Creating subscription');
    return 'mp_sub_mock_123';
  }

  async processOneTimePayment(amount: number, methodId: string) {
    return { success: true, transactionId: 'mp_txn_mock_123' };
  }

  async webhookHandler(payload: any) {
    // Handle notification
  }
}
