import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Subscribe to Supabase realtime changes (safe version with lint suppression).
 */
export function useSupabaseRealtime(
  events: ("INSERT" | "UPDATE" | "DELETE")[],
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any    
  onChange: (payload: RealtimePostgresChangesPayload<any>) => void
) {
  useEffect(() => {
    if (!events.length) return;
    
    const channel = supabase.channel(`${table}_realtime`);

    events.forEach(event => {
      channel.on(
        // @ts-expect-error - Supabase typing issue, we know this is correct
        "postgres_changes",
        { event, schema: "public", table },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: RealtimePostgresChangesPayload<any>) => {
          onChange(payload);
        }
      );
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [events, table, onChange]);
}
