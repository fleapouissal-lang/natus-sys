"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProClientSubmitResult, ProClientType } from "@/lib/pro-client/types";

function mapSubmitResult(raw: Record<string, unknown>): ProClientSubmitResult {
  const status = String(raw.status || "invalid");
  if (status === "success") {
    return {
      status: "success",
      customerId: String(raw.customer_id),
      qrToken: String(raw.qr_token),
      cardNumber: String(raw.card_number),
    };
  }
  return { status: "invalid" };
}

export async function submitProClientRegistration(input: {
  storeToken: string;
  clientType: ProClientType;
  fullName?: string;
  phone?: string;
  email: string;
  companyName?: string;
  city?: string;
  address?: string;
}): Promise<ProClientSubmitResult | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_pro_client_registration_by_store", {
    p_store_token: input.storeToken,
    p_client_type: input.clientType,
    p_full_name: input.fullName?.trim() || null,
    p_phone: input.phone?.trim() || null,
    p_email: input.email.trim(),
    p_company_name: input.companyName?.trim() || null,
    p_city: input.city?.trim() || null,
    p_address: input.address?.trim() || null,
  });

  if (error) {
    return { error: error.message };
  }

  return mapSubmitResult((data || {}) as Record<string, unknown>);
}
