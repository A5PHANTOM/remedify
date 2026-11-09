import { NextResponse } from "next/server";
import { dbRepo } from "@/lib/db-repo";
import { z } from "zod";
import crypto from "node:crypto";
import { Resend } from "resend";

const bodySchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Generate cryptographically secure 6-digit code
    const code = crypto.randomInt(100000, 1000000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await dbRepo.saveVerificationToken(email, code, expires);

    // If Resend API Key is configured, send the real email
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Remidify <onboarding@resend.dev>",
        to: email,
        subject: `${code} is your Remidify sign-in code`,
        text: `Your Remidify 6-digit sign-in code is: ${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this, you can safely ignore this email.`,
      });

      return NextResponse.json({
        success: true,
        message: "A 6-digit sign-in code has been sent to your email.",
      });
    }

    // Development fallback when email server credentials are not yet supplied
    console.log(`\n======================================================`);
    console.log(`[AUTH DEV] Sign-in code for ${email}: ${code}`);
    console.log(`======================================================\n`);

    return NextResponse.json({
      success: true,
      message: "Development mode: sign-in code generated and logged.",
      devCode: process.env.NODE_ENV !== "production" ? code : undefined,
    });
  } catch (err: unknown) {
    console.error("Failed to generate and send sign-in code:", err);
    return NextResponse.json(
      { error: "Failed to generate sign-in code. Please try again." },
      { status: 500 }
    );
  }
}

