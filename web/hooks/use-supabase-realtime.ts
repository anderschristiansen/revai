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

/**
 * A specialized hook that subscribes to session evaluation status changes
 * and provides more reliable updates for ai_evaluation_running and awaiting_ai_evaluation flags
 */
export function useSessionStatusRealtime(
  sessionId: string,
  onStatusChange: (running: boolean, awaiting: boolean) => void
) {
  useEffect(() => {
    if (!sessionId) return;
    
    // Create a dedicated channel for this specific monitoring
    const channel = supabase.channel(`session_status_${sessionId}`);
    
    channel.on(
      "postgres_changes",
      { 
        event: "UPDATE", 
        schema: "public", 
        table: "review_sessions",
        filter: `id=eq.${sessionId}`
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: RealtimePostgresChangesPayload<any>) => {
        if (payload.new?.id === sessionId) {
          // Extract the status flags with safe defaults
          const isRunning = !!payload.new?.ai_evaluation_running;
          const isAwaiting = !!payload.new?.awaiting_ai_evaluation;
          
          // Call the callback with the current status
          onStatusChange(isRunning, isAwaiting);
        }
      }
    );
    
    channel.subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, onStatusChange]);
}
