import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/images";

/**
 * Hands the admin's browser a short-lived token to upload one image straight to Vercel Blob,
 * so photos never pass through (or count against) our function's request size.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session || session.user.role !== "admin") throw new Error("Not signed in");
        if (!/^(restorani|stavke)\//.test(pathname)) throw new Error("Unexpected path");
        return {
          allowedContentTypes: [...IMAGE_TYPES],
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
