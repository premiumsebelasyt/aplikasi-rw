import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL_MISSING");
}

if (!supabasePublishableKey) {
  throw new Error("SUPABASE_KEY_MISSING");
}

console.log("SUPABASE ENV CHECK", {
  urlExists: Boolean(supabaseUrl),
  urlLength: supabaseUrl.length,
  urlStartsCorrectly: supabaseUrl.startsWith("https://"),
  keyExists: Boolean(supabasePublishableKey),
  keyLength: supabasePublishableKey.length,
  keyStartsCorrectly:
    supabasePublishableKey.startsWith("sb_publishable_"),
});

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);