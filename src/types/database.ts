export interface Product {
  id: string;
  name: string;
  category: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  customer_id: string | null;
  total_amount: number;
  total_profit: number;
  payment_method: 'dinheiro' | 'pix' | 'cartao';
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
  profit: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_amount: number;
  payment_method: 'dinheiro' | 'pix' | 'cartao';
  created_at: string;
}

export interface CashFlow {
  id: string;
  type: 'entrada' | 'saida';
  category: string;
  description: string | null;
  amount: number;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface Bill {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao';

export interface SaleItemInput {
  product: Product;
  quantity: number;
}
