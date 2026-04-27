import { NextRequest, NextResponse } from "next/server";
import { updateDiner, archiveDiner, findDinerById } from "@/lib/db/diners";
import { dinerUpdateSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const parsed = dinerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const found = await findDinerById(Number(id));
  if (!found) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  await updateDiner(Number(id), parsed.data);
  return new NextResponse(null, { status: 204 });
}

// Soft-delete (archive)
export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await archiveDiner(Number(id));
  return new NextResponse(null, { status: 204 });
}
