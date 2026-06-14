import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(buildOpenApiDocument());
}
