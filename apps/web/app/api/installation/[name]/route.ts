import { installationManifest } from "../../../../lib/installation";

export const dynamic = "force-dynamic";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) => {
  try {
    const { name } = await params;
    const manifest = await installationManifest(name);

    return manifest
      ? Response.json(manifest)
      : new Response("Installation not found", { status: 404 });
  } catch {
    return new Response(
      "Installation inventory could not be loaded. Retry this request.",
      { status: 503 }
    );
  }
};
