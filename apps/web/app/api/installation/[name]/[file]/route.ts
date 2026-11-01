import { installationSource } from "../../../../../lib/installation";

export const dynamic = "force-dynamic";

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ name: string; file: string }> }
) => {
  try {
    const { name, file } = await params;
    const source = await installationSource(name, file);

    if (!source) {
      return new Response("Installation file not found", { status: 404 });
    }

    const headers = new Headers({
      "Content-Type": "text/plain; charset=utf-8",
      "X-Grasscn-Destination": source.destination,
    });

    if (new URL(request.url).searchParams.has("download")) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${source.destination.split("/").at(-1)}"`
      );
    }

    return new Response(source.contents, { headers });
  } catch {
    return new Response(
      "Installation file could not be loaded. Retry this request.",
      { status: 503 }
    );
  }
};
