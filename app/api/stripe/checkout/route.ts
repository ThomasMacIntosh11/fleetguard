import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Payments are temporarily disabled." },
    { status: 503 }
  );
}