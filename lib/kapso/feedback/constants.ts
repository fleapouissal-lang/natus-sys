export const FEEDBACK_BUTTON_PREFIX = "natus_fb:";

export type FeedbackTargetKind = "order" | "sale";
export type FeedbackAction = "good" | "reclam";

export type ParsedFeedbackButton = {
  action: FeedbackAction;
  kind: FeedbackTargetKind;
  resourceId: string;
};

export function buildFeedbackButtonId(
  action: FeedbackAction,
  kind: FeedbackTargetKind,
  resourceId: string
): string {
  return `${FEEDBACK_BUTTON_PREFIX}${action}:${kind}:${resourceId}`;
}

export function parseFeedbackButtonId(buttonId: string): ParsedFeedbackButton | null {
  if (!buttonId.startsWith(FEEDBACK_BUTTON_PREFIX)) return null;
  const rest = buttonId.slice(FEEDBACK_BUTTON_PREFIX.length);
  const [action, kind, ...idParts] = rest.split(":");
  const resourceId = idParts.join(":");
  if (
    (action !== "good" && action !== "reclam") ||
    (kind !== "order" && kind !== "sale") ||
    resourceId.length < 8
  ) {
    return null;
  }
  return { action, kind, resourceId };
}
