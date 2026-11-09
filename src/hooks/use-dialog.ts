"use client";

import { useEffect, useRef } from "react";

/** Focus containment, Escape, and visual viewport positioning for mobile sheets. */
export function useDialog(isOpen: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const viewport = window.visualViewport;
    const resize = () => {
      document.documentElement.style.setProperty("--keyboard-offset", `${Math.max(0, window.innerHeight - (viewport?.height || window.innerHeight) - (viewport?.offsetTop || 0))}px`);
      document.documentElement.style.setProperty("--visible-height", `${viewport?.height || window.innerHeight}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    const background = Array.from(document.querySelectorAll<HTMLElement>(".app-header, .app-content, .bottom-bar"));
    background.forEach((element) => { element.inert = true; });
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea, select, [tabindex="0"]') || []).filter((element) => element.getClientRects().length > 0);
    const timer = window.setTimeout(() => focusable()[0]?.focus({ preventScroll: true }), 30);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", keydown);
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      background.forEach((element) => { element.inert = false; });
      previousFocus?.focus({ preventScroll: true });
    };
  }, [isOpen]);
  return ref;
}
