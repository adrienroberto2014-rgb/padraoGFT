import { useProducts } from './useProducts';
import { useSales } from './useSales';
import { useInstallments } from './useInstallments';
import { useStudents } from './useStudents';
import { ISale } from '../ports/ISaleRepository';
import { IInstallment } from '../ports/IInstallmentRepository';
import { IProduct } from '../ports/IProductRepository';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useInventory = (enabled: boolean = true) => {
  const { isAdmin, permissions, user } = useAuth();
  
  const productsHook = useProducts(enabled && (isAdmin || permissions?.inventory));
  const salesHook = useSales(enabled && (isAdmin || permissions?.inventory));
  const installmentsHook = useInstallments(enabled && (isAdmin || permissions?.finance));
  const studentsHook = useStudents(enabled, isAdmin || permissions?.students, (isAdmin || permissions?.students) ? undefined : user?.email);

  const processSale = async (params: {
    productId: string;
    studentId: string | null;
    amount: number;
    installments: number;
    method: string;
    date: string;
    firstPaymentDate: string;
  }) => {
    const product = productsHook.products.find(p => p.id === params.productId);
    if (!product) throw new Error("Produto não encontrado");
    if (product.stock <= 0) throw new Error("Produto sem estoque!");

    const student = params.studentId ? studentsHook.students.find(s => s.id === params.studentId) : null;
    const saleId = Math.random().toString(36).substring(7);

    // 1. Record sale
    await salesHook.addSale({
      studentId: params.studentId || 'Avulso',
      studentName: student?.name || 'Venda Avulsa',
      items: [{
        productId: product.id!,
        productName: product.name,
        quantity: 1,
        price: params.amount
      }],
      totalAmount: params.amount,
      paymentMethod: params.method,
      date: new Date(params.date),
      status: 'completed'
    });

    // 2. Generate installments if applicable
    if (params.installments > 1 && params.method === 'Parcelado Academia') {
      const installmentAmount = params.amount / params.installments;
      const startDate = new Date(params.firstPaymentDate + 'T12:00:00');

      for (let i = 0; i < params.installments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        await installmentsHook.addInstallment({
          saleId,
          studentId: params.studentId || null,
          studentName: student?.name || 'Venda Avulsa',
          productName: product.name,
          amount: installmentAmount,
          installmentNumber: i + 1,
          totalInstallments: params.installments,
          dueDate: dueDate,
          status: 'pending',
          paymentMethod: params.method
        });
      }
    }

    // 3. Update stock
    await productsHook.updateProduct(product.id!, {
      stock: product.stock - 1
    });

    toast.success("Venda realizada!");
  };

  return {
    products: productsHook.products,
    sales: salesHook.sales,
    loading: productsHook.loading || salesHook.loading,
    addProduct: productsHook.addProduct,
    updateProduct: productsHook.updateProduct,
    deleteProduct: productsHook.deleteProduct,
    addSale: salesHook.addSale,
    processSale
  };
};
