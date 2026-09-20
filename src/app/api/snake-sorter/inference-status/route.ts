import { NextResponse } from "next/server";
import { fetchOwnProfile, getServerIdentity } from "@/lib/supabase-auth";

async function ownerIdentity() {
  const identity = await getServerIdentity();
  if (!identity) return null;
  const profile = await fetchOwnProfile(identity.token, identity.user.id) as { role?: string } | null;
  if (profile?.role !== "owner") return null;
  return identity;
}

function cleanBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export async function GET() {
  const identity = await ownerIdentity();
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inferenceUrl = process.env.SNAKE_SORTER_INFERENCE_URL?.trim();
  const inferenceToken = process.env.SNAKE_SORTER_INFERENCE_TOKEN?.trim();

  if (!inferenceUrl || !inferenceToken) {
    return NextResponse.json({
      configured: false,
      online: false,
      message: "Inference service is not configured.",
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${cleanBaseUrl(inferenceUrl)}/health`, {
      headers: { Authorization: `Bearer ${inferenceToken}` },
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      return NextResponse.json({
        configured: true,
        online: false,
        message: typeof data.detail === "string" ? data.detail : `Health check returned HTTP ${response.status}.`,
      });
    }
    return NextResponse.json({
      configured: true,
      online: data.ok === true,
      modelVersion: typeof data.modelVersion === "string" ? data.modelVersion : null,
      modelRegistryId: typeof data.modelRegistryId === "string" ? data.modelRegistryId : null,
      device: typeof data.device === "string" ? data.device : null,
      references: typeof data.references === "number" ? data.references : 0,
      embeddingDimension: typeof data.embeddingDimension === "number" ? data.embeddingDimension : null,
    });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      online: false,
      message: error instanceof Error && error.name === "AbortError"
        ? "Inference service health check timed out."
        : "Inference service is unreachable.",
    });
  } finally {
    clearTimeout(timer);
  }
}
