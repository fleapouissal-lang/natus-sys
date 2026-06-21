import { cn } from "@/lib/utils";

/** Logo texte — fiable à l'impression (pas de Next/Image ni SVG externe). */
export function NatusDocumentBrand({
  variant = "invoice",
  className,
}: {
  variant?: "invoice" | "ticket" | "invoiceLogo";
  className?: string;
}) {
  const isTicket = variant === "ticket";
  const isInvoiceLogo = variant === "invoiceLogo";

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-center text-center text-[#b38c4a]",
        variant === "invoice" && "h-[88px] w-[88px] rounded-full border-2 border-[#d4c4a8] bg-white",
        isInvoiceLogo && "items-end text-right",
        isTicket && "py-1",
        className
      )}
      aria-hidden
    >
      <span
        className={cn(
          "font-semibold leading-none tracking-tight",
          isInvoiceLogo ? "text-[2.5rem]" : isTicket ? "text-[20px]" : "text-[26px]"
        )}
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        natus
      </span>
      {!isInvoiceLogo && (
        <span
          className={cn(
            "mt-1 font-medium uppercase text-[#a07d3f]",
            isTicket ? "text-[6px] tracking-[0.26em]" : "text-[7px] tracking-[0.28em]"
          )}
        >
          Marrakech
        </span>
      )}
    </div>
  );
}
