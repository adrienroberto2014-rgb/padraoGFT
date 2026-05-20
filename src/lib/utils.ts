import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

export function getBeltColor(belt: string) {
  switch (belt.toLowerCase()) {
    case 'white': return 'bg-white text-gray-800 border-gray-300';
    case 'blue': return 'bg-blue-600 text-white';
    case 'purple': return 'bg-purple-700 text-white';
    case 'brown': return 'bg-amber-900 text-white';
    case 'black': return 'bg-gray-900 text-white border-red-600 border-2';
    default: return 'bg-gray-100 text-gray-800';
  }
}
