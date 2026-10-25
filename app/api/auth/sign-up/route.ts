import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Canonical RW16 accounts must be linked after out-of-band household
 * verification. Public signup cannot establish that relationship safely.
 * Keep this endpoint fail-closed until a reviewed provisioning flow exists.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Pendaftaran mandiri belum tersedia. Hubungi pengurus RW untuk verifikasi dan aktivasi akun." },
    { status: 503 },
  );
}
