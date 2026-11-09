import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { dbRepo } from "./lib/db-repo";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6).regex(/^\d{6}$/),
});

const providers: any[] = [
  Credentials({
    name: "EmailCode",
    credentials: {
      email: { label: "Email", type: "email" },
      code: { label: "6-Digit Code", type: "text" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) {
        return null;
      }

      const { email, code } = parsed.data;
      const isValid = await dbRepo.verifyAndConsumeToken(email, code);
      if (!isValid) {
        return null;
      }

      const user = await dbRepo.createOrGetUser(email);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

const googleClientId =
  process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      const email = (user?.email || token.email) as string | undefined;
      if (email) {
        try {
          const dbUser = await dbRepo.createOrGetUser(
            email,
            (user?.name || token.name) as string | null,
            (user?.image || token.picture) as string | null
          );
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.picture = dbUser.image;
        } catch (e) {
          console.error("[jwt callback] Error syncing user:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | null | undefined;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (user?.email) {
        try {
          const dbUser = await dbRepo.createOrGetUser(
            user.email,
            user.name,
            user.image
          );
          user.id = dbUser.id;
        } catch (e) {
          console.error("[signIn event] Error syncing user:", e);
        }
      }
    },
  },
});

