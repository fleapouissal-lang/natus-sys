"use client";

import { createClient } from "@/lib/supabase/client";
import { SESSION_LAST_ACTIVITY_KEY } from "@/lib/auth/session-config";
import { signOutPosOperator } from "@/lib/pos/actions";

export async function performClientLogout(options?: { isStorePos?: boolean }) {
  if (options?.isStorePos) {
    await signOutPosOperator();
  }

  const supabase = createClient();
  await supabase.auth.signOut();
  localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
  window.location.assign("/login");
}
