import { supabase } from "@/lib/supabase";

/**
 * Fetches the current logged-in user's ID.
 * @returns The user's UUID (string) or throws an error if not logged in
 */
export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    console.error("Failed to get current logged in supabase user:", error);
    throw new Error("User not logged in");
  }

  return data.user.id;
}
