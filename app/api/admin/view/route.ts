import { cookies } from "next/headers";
import { route } from "@/lib/server/api";
import { VIEW_COOKIE } from "@/lib/server/view-as";

/** Leaves the "view as" mode; harmless when not viewing. */
export const DELETE = route(async () => {
  (await cookies()).delete(VIEW_COOKIE);
  return { ok: true };
});
