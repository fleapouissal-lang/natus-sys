import { createAdminClient } from "@/lib/supabase/admin";
import type { BotSessionState } from "@/lib/kapso/whatsapp-bot/constants";
import type { ChatTurn } from "@/lib/kapso/whatsapp-bot/gemini";

export type BotSession = {
  phone: string;
  state: BotSessionState;
  last_order_id: string | null;
  pending_problem: string | null;
  history: ChatTurn[];
  updated_at: string;
};

function parseHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is ChatTurn =>
        typeof item === "object" &&
        item !== null &&
        (item as ChatTurn).role !== undefined &&
        typeof (item as ChatTurn).text === "string"
    )
    .slice(-10);
}

export async function getBotSession(phone: string): Promise<BotSession | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("whatsapp_bot_sessions")
    .select("phone, state, last_order_id, pending_problem, history, updated_at")
    .eq("phone", phone)
    .maybeSingle();

  if (!data) return null;
  return {
    ...(data as Omit<BotSession, "history">),
    history: parseHistory((data as { history?: unknown }).history),
  };
}

export async function upsertBotSession(
  phone: string,
  patch: Partial<
    Pick<BotSession, "state" | "last_order_id" | "pending_problem" | "history">
  >
): Promise<void> {
  const admin = createAdminClient();
  const existing = await getBotSession(phone);

  await admin.from("whatsapp_bot_sessions").upsert(
    {
      phone,
      state: patch.state ?? existing?.state ?? "idle",
      last_order_id:
        patch.last_order_id !== undefined
          ? patch.last_order_id
          : (existing?.last_order_id ?? null),
      pending_problem:
        patch.pending_problem !== undefined
          ? patch.pending_problem
          : (existing?.pending_problem ?? null),
      history: patch.history ?? existing?.history ?? [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone" }
  );
}

export async function appendBotHistory(
  phone: string,
  userText: string,
  modelReply: string,
  orderId: string | null
): Promise<void> {
  const existing = await getBotSession(phone);
  const history: ChatTurn[] = [
    ...(existing?.history ?? []),
    { role: "user", text: userText },
    { role: "model", text: modelReply },
  ].slice(-10);

  await upsertBotSession(phone, {
    state: "idle",
    last_order_id: orderId ?? existing?.last_order_id ?? null,
    history,
  });
}

export async function resetBotSession(phone: string): Promise<void> {
  await upsertBotSession(phone, {
    state: "idle",
    last_order_id: null,
    pending_problem: null,
    history: [],
  });
}
