// Vercel Function entry — wraps the Express app exported from server/main.ts.
// This file is bundled by esbuild during the Vercel build into api/index.js
// (see vercel.json buildCommand). The bundled output is what Vercel's Node
// runtime loads; the .ts source lives outside api/ so Vercel doesn't try to
// transpile it standalone (which leaves `import "./main"` unresolved at
// runtime because there's no server/main.js sitting alongside).
import type { IncomingMessage, ServerResponse } from "http";
import { getApp } from "./main";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const app = await getApp();
  return (app as any)(req, res);
}
