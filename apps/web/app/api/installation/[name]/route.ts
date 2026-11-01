import { installationManifest } from "../../../../lib/installation";

export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const manifest = await installationManifest((await params).name);
    return manifest
      ? Response.json(manifest)
      : new Response("Installation not found", { status: 404 });
  } catch {
    return new Response(
      "Installation inventory could not be loaded. Retry this request.",
      { status: 503 }
    );
  }
}
