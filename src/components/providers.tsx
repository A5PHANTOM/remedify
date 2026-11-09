"use client";

import { MotionConfig } from "framer-motion";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider><MotionConfig reducedMotion="user">{children}</MotionConfig></SessionProvider>;
}

