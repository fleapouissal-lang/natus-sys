export type SaleChequeStatus = "pending" | "deposited" | "received" | "rejected";

export type SaleChequeDetails = {
  bankName: string;
  chequeNumber: string;
  chequeAmount: number;
  drawerName?: string;
  issueDate?: string;
  notes?: string;
};

export type SaleChequeRow = {
  id: string;
  sale_id: string;
  store_id: string;
  bank_name: string;
  cheque_number: string;
  cheque_amount: number;
  drawer_name: string | null;
  issue_date: string | null;
  notes: string | null;
  status: SaleChequeStatus;
  status_updated_at: string | null;
  status_updated_by: string | null;
  updated_at: string;
  updated_by: string | null;
  created_by: string;
  created_at: string;
  sale?: {
    id: string;
    total: number;
    created_at: string;
    customer_name: string;
    cancelled_at: string | null;
  } | null;
  store?: { name: string; city: string } | null;
  cashier?: { full_name: string | null; email: string } | null;
};
