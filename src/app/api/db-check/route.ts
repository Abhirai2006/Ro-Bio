import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// Temporary check that the site can reach Supabase. Delete this file once it says ok.
export async function GET() {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("events").select("slug,title");
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true, events: data });
  } catch {
    return Response.json({ ok: false, error: "Supabase address or key is missing in the build variables." }, { status: 500 });
  }
}
