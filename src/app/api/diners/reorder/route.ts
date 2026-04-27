import { NextRequest, NextResponse } from "next/server";
import { reorderDiners } from "@/lib/db/diners";
import { dinerReorderSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = dinerReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  await reorderDiners(parsed.data.orderedIds);
  return new NextResponse(null, { status: 204 });
}
