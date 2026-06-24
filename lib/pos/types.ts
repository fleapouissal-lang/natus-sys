export type PosOperatorSession = {
  id: string;
  store_id: string;
  terminal_user_id: string;
  operator_id: string;
  auth_method: "password" | "nfc";
  started_at: string;
  ended_at: string | null;
  operator?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
};

export type CashierNfcCard = {
  id: string;
  cashier_id: string;
  store_id: string;
  nfc_uid: string;
  label: string | null;
  is_active: boolean;
};
