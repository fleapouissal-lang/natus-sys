export const BOT_BUTTON_PREFIX = "natus_bot:";

export const BOT_BUTTONS = {
  yes: `${BOT_BUTTON_PREFIX}yes`,
  menuTrack: `${BOT_BUTTON_PREFIX}menu_track`,
  menuProblem: `${BOT_BUTTON_PREFIX}menu_problem`,
} as const;

export type BotSessionState =
  | "idle"
  | "offered_details"
  | "offered_menu"
  | "awaiting_problem"
  | "awaiting_reclamation";
