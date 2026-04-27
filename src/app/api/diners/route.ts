import { NextRequest, NextResponse } from "next/server";
import { listDiners, createDiner, findDinerByKey } from "@/lib/db/diners";
import { dinerCreateSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const includeArchived =
    request.nextUrl.searchParams.get("archived") === "true";
  const diners = await listDiners(includeArchived);
  return NextResponse.json(diners);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = dinerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const existing = await findDinerByKey(parsed.data.key);
  if (existing) {
    return NextResponse.json(
      { error: "Une personne avec cette clé existe déjà" },
      { status: 409 }
    );
  }
  const created = await createDiner(parsed.data);
  return NextResponse.json(created, { status: 201 });
}
