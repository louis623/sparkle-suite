import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { getAuthenticatedRep } from "@/lib/supabase/auth";

type Operator = Awaited<ReturnType<typeof getAuthenticatedRep>>;
export type LocOperatorContext = {
  operator: Operator;
  ownerId: string;
  connectionId: string;
  intendedAssignee: string | null;
};
const storage = new AsyncLocalStorage<LocOperatorContext>();
// Only the authenticated internal dispatcher enters this context. It is not
// populated from headers in any public or legacy operator route.
export const getLocOperatorContext = () => storage.getStore();
export const runWithLocOperator = <T>(
  context: LocOperatorContext,
  run: () => Promise<T>,
) => storage.run(context, run);
