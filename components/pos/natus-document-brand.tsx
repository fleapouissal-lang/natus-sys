import { NATUS_BRAND, NATUS_BRAND_SERIF } from "@/lib/constants/natus-brand";
import { cn } from "@/lib/utils";

/** Logo texte — fiable à l'impression (pas de Next/Image ni SVG externe). */
export function NatusDocumentBrand({
  variant = "invoice",
  className,
  monochrome = false,
}: {
  variant?: "invoice" | "ticket" | "invoiceLogo";
  className?: string;
  /** Ticket thermique : noir uniquement */
  monochrome?: boolean;
}) {
  const isTicket = variant === "ticket";
  const isInvoiceLogo = variant === "invoiceLogo";
  const ink = monochrome ? "#000000" : NATUS_BRAND.gold;

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-center text-center",
        variant === "invoice" && "h-[88px] w-[88px] rounded-full border-2 bg-white",
        isInvoiceLogo && "items-end text-right",
        isTicket && "py-1",
        className
      )}
      style={{
        color: ink,
        ...(variant === "invoice" && !monochrome
          ? { borderColor: NATUS_BRAND.border }
          : variant === "invoice"
            ? { borderColor: "#000" }
            : {}),
      }}
      aria-hidden
    >
      <span
        className={cn(
          "font-semibold leading-none tracking-tight",
          isInvoiceLogo ? "text-[2.5rem]" : isTicket ? "text-[20px]" : "text-[26px]"
        )}
        style={{ fontFamily: NATUS_BRAND_SERIF }}
      >
        {isInvoiceLogo ? "Natus" : "natus"}
      </span>
    </div>
  );
}
