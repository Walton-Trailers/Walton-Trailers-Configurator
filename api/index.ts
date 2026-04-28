// Vercel Function entry — wraps the Express app exported from server/main.ts.
// Vercel's Node runtime (Fluid Compute) keeps the warm instance alive across
// requests, so initializeServer() runs once per cold start.
import type { IncomingMessage, ServerResponse } from "http";
import { getApp } from "../server/main";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const app = await getApp();
  return (app as any)(req, res);
}
