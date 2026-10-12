import type { UserSignupEvent, UserValidateEvent } from "@netlify/functions";
import { db } from "../../db/index.js";
import { adminAccount } from "../../db/schema.js";

async function adminExists() {
  const rows = await db.select({ id: adminAccount.id }).from(adminAccount).limit(1);
  return rows.length > 0;
}

export default {
  // Once the admin account exists, nobody else can register
  async userValidate(event: UserValidateEvent) {
    if (await adminExists()) return event.deny();
  },

  // The first account to complete signup claims the single admin slot
  async userSignup(event: UserSignupEvent) {
    const claimed = await db
      .insert(adminAccount)
      .values({ id: 1, userId: event.user.id, email: event.user.email ?? "" })
      .onConflictDoNothing()
      .returning();

    if (!claimed.length) return event.deny();

    const roles = Array.isArray(event.user.appMetadata?.roles) ? event.user.appMetadata.roles : [];
    return {
      user: {
        ...event.user,
        appMetadata: {
          ...event.user.appMetadata,
          roles: Array.from(new Set([...roles, "admin"])),
        },
      },
    };
  },
};
