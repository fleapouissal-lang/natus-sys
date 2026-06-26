"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const INTERACTIVE_SELECTOR =
  "a, button, [role='button'], input, select, textarea, label, summary, [data-natus-cursor='pointer'], .cursor-pointer";

function isPosRoute(pathname: string): boolean {
  return pathname === "/cashier/pos" || pathname.startsWith("/cashier/pos/");
}

export function NatusCursor() {
  const pathname = usePathname();
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [pointer, setPointer] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);

  const target = useRef({ x: 0, y: 0 });
  const dot = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const shouldEnable = finePointer && !reducedMotion && !isPosRoute(pathname);

    setEnabled(shouldEnable);
    document.documentElement.classList.toggle("natus-custom-cursor", shouldEnable);

    if (!shouldEnable) {
      setVisible(false);
      return () => {
        document.documentElement.classList.remove("natus-custom-cursor");
      };
    }

    function animate() {
      dot.current.x += (target.current.x - dot.current.x) * 0.38;
      dot.current.y += (target.current.y - dot.current.y) * 0.38;
      ring.current.x += (target.current.x - ring.current.x) * 0.14;
      ring.current.y += (target.current.y - ring.current.y) * 0.14;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dot.current.x}px, ${dot.current.y}px, 0)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0)`;
      }

      frame.current = window.requestAnimationFrame(animate);
    }

    function onMove(event: MouseEvent) {
      target.current.x = event.clientX;
      target.current.y = event.clientY;
      setVisible(true);

      const hit = (event.target as Element | null)?.closest(INTERACTIVE_SELECTOR);
      setPointer(Boolean(hit));
    }

    function onDown() {
      setPressed(true);
    }

    function onUp() {
      setPressed(false);
    }

    function onLeave() {
      setVisible(false);
    }

    frame.current = window.requestAnimationFrame(animate);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseleave", onLeave);

    return () => {
      if (frame.current != null) window.cancelAnimationFrame(frame.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseleave", onLeave);
      document.documentElement.classList.remove("natus-custom-cursor");
    };
  }, [pathname]);

  if (!enabled) return null;

  return (
    <div
      className={cn(
        "natus-cursor",
        visible && "natus-cursor--visible",
        pointer && "natus-cursor--pointer",
        pressed && "natus-cursor--pressed"
      )}
      aria-hidden
    >
      <div ref={ringRef} className="natus-cursor__ring" />
      <div ref={dotRef} className="natus-cursor__dot" />
    </div>
  );
}
