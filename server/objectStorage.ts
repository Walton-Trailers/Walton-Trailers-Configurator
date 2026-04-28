import { put, head, del, list } from "@vercel/blob";

type HeadResult = Awaited<ReturnType<typeof head>>;
import type { Response } from "express";
import { randomUUID } from "crypto";

// Minimal ACL surface — Vercel Blob doesn't expose per-object ACL the way GCS did.
// Trailer images are public-facing, so we use the public-access store and treat
// every object as { owner: "admin", visibility: "public" }. The shape below is
// kept so the rest of the codebase that imports it from here keeps compiling.
export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
}

// Lightweight handle the rest of the app passes around in place of GCS File.
export interface BlobObject {
  pathname: string;
  url: string;
  contentType?: string;
  size?: number;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// Strips the "/objects/" prefix from a path stored in the DB and returns the
// Blob pathname (e.g. "/objects/models/abc" → "models/abc").
function dbPathToBlobPath(objectPath: string): string {
  if (!objectPath.startsWith("/objects/")) {
    throw new ObjectNotFoundError();
  }
  return objectPath.slice("/objects/".length);
}

// Resolves a Vercel Blob URL → "/objects/<pathname>" so callers can store a
// short relative path in the DB (matches the legacy format).
function blobUrlToDbPath(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    if (
      u.hostname.endsWith(".public.blob.vercel-storage.com") ||
      u.hostname.endsWith(".blob.vercel-storage.com")
    ) {
      const pathname = u.pathname.replace(/^\//, "");
      return `/objects/${pathname}`;
    }
  } catch {
    // not a URL
  }
  return null;
}

export class ObjectStorageService {
  constructor() {}

  // Legacy API — kept so existing callers that call these getters still work.
  // PUBLIC_OBJECT_SEARCH_PATHS / PRIVATE_OBJECT_DIR are no longer used at runtime
  // but we don't throw if unset; tests and admin-seed paths may reference them.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    return pathsStr
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  getPrivateObjectDir(): string {
    return process.env.PRIVATE_OBJECT_DIR || "";
  }

  // Search for a public object by pathname. Returns null if not found.
  async searchPublicObject(filePath: string): Promise<BlobObject | null> {
    const cleaned = filePath.replace(/^\/+/, "");
    try {
      const meta = await head(cleaned);
      return blobMetaToObject(cleaned, meta);
    } catch {
      return null;
    }
  }

  // Stream/redirect the blob to the response. With public Blob URLs we just
  // 302-redirect — the CDN serves the file directly, fastest path.
  async downloadObject(
    file: BlobObject,
    res: Response,
    cacheTtlSec: number = 3600,
  ): Promise<void> {
    res.set({
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    });
    res.redirect(302, file.url);
  }

  // Returns a URL the client can PUT a file to. Our /api/blob-upload/:id route
  // handler in routes.ts streams the body into Vercel Blob server-side.
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    const baseUrl = process.env.BASE_URL || "";
    // BASE_URL is preferred (set explicitly on Vercel); fall back to a relative
    // URL which Uppy will resolve against the page origin.
    const path = `/api/blob-upload/${encodeURIComponent(`models/${objectId}`)}`;
    return baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
  }

  // Resolves "/objects/<pathname>" to a BlobObject by hitting head().
  async getObjectEntityFile(objectPath: string): Promise<BlobObject> {
    const pathname = dbPathToBlobPath(objectPath);
    try {
      const meta = await head(pathname);
      return blobMetaToObject(pathname, meta);
    } catch {
      throw new ObjectNotFoundError();
    }
  }

  // Normalize whatever the client just uploaded (a full Vercel Blob URL or
  // sometimes just a path) into the canonical "/objects/<pathname>" form that
  // the DB stores.
  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath) return rawPath;
    if (rawPath.startsWith("/objects/")) return rawPath;
    const fromBlobUrl = blobUrlToDbPath(rawPath);
    if (fromBlobUrl) return fromBlobUrl;
    return rawPath;
  }

  // Sets ACL — Vercel Blob has no per-object ACL on public stores. Normalizing
  // the path is the only useful work here, so this just delegates.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    _aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    return this.normalizeObjectEntityPath(rawPath);
  }

  // Public-access blobs are readable by anyone; we don't gate reads at this
  // layer. Write/delete is only triggered by authed admin endpoints upstream.
  async canAccessObjectEntity(_args: {
    userId?: string;
    objectFile: BlobObject;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return true;
  }
}

// Server-side helpers used by routes.ts /api/blob-upload/:id PUT handler and the
// import-images.mjs script.
export async function uploadBlob(
  pathname: string,
  body: Buffer | Blob | ReadableStream | ArrayBuffer | string,
  contentType?: string,
): Promise<BlobObject> {
  const result = await put(pathname, body, {
    access: "public",
    allowOverwrite: true,
    contentType,
  });
  return {
    pathname: result.pathname,
    url: result.url,
    contentType: result.contentType,
  };
}

export async function deleteBlob(pathname: string): Promise<void> {
  await del(pathname);
}

export async function listBlobs(prefix?: string) {
  return list({ prefix });
}

function blobMetaToObject(pathname: string, meta: HeadResult): BlobObject {
  return {
    pathname,
    url: meta.url,
    contentType: meta.contentType,
    size: meta.size,
  };
}
