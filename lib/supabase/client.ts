import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

const supabaseEnvCheck = {
  urlExists: Boolean(supabaseUrl),
  urlLength: supabaseUrl?.length ?? 0,
  urlStartsCorrectly:
    supabaseUrl?.startsWith("https://") ?? false,
  keyExists: Boolean(supabasePublishableKey),
  keyLength: supabasePublishableKey?.length ?? 0,
  keyStartsCorrectly:
    supabasePublishableKey?.startsWith("sb_publishable_") ?? false,
};

if (typeof window !== "undefined") {
  console.error(
    "SUPABASE ENV CHECK:",
    supabaseEnvCheck
  );
}

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL_MISSING");
}

if (!supabasePublishableKey) {
  throw new Error("SUPABASE_KEY_MISSING");
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);