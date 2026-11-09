import { NextResponse } from "next/server";
import { configurePush } from "@/lib/push-server";

export async function GET() {
  if (!configurePush()) return NextResponse.json({ error: "Notifications are not configured." }, { status: 503 });
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY }, { headers: { "Cache-Control": "no-store" } });
}
