/**
 * send-notifications Edge Function
 *
 * Processes the notification queue and sends push notifications via Expo Push API.
 * Runs on a schedule (every 5 minutes) or can be triggered manually.
 *
 * Features:
 * - Fetches pending notifications from queue
 * - Batches notifications to Expo Push API (max 100 per request)
 * - Handles success/failure and retries
 * - Processes batched notifications (e.g., multiple followers -> "5 new followers")
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { createLogger } from "../_shared/logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Expo Push API endpoint
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const logger = createLogger("send-notifications");

interface PendingNotification {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  tokens: string[];
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

/**
 * Send notifications to Expo Push API
 */
async function sendToExpo(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];

  // Expo accepts max 100 messages per request
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const allTickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        logger.error("Expo API error", new Error(`HTTP ${response.status}`));
        // Return error tickets for all messages in chunk
        allTickets.push(...chunk.map(() => ({
          status: "error" as const,
          message: `HTTP ${response.status}`,
        })));
        continue;
      }

      const result = await response.json();
      allTickets.push(...(result.data || []));
    } catch (error) {
      logger.error("Failed to send to Expo", error);
      allTickets.push(...chunk.map(() => ({
        status: "error" as const,
        message: error.message,
      })));
    }
  }

  return allTickets;
}

/**
 * Get notification channel based on type
 */
function getChannelId(type: string): string {
  switch (type) {
    case "event_reminder":
      return "reminders";
    case "picks_graded":
      return "results";
    case "new_follower":
    case "friend_activity":
      return "social";
    case "streak_at_risk":
      return "alerts";
    default:
      return "default";
  }
}

/**
 * Get notification priority based on type
 */
function getPriority(type: string): "high" | "normal" | "default" {
  switch (type) {
    case "event_reminder":
    case "streak_at_risk":
      return "high";
    case "picks_graded":
      return "normal";
    default:
      return "default";
  }
}

serve(async (req) => {
  const startTime = Date.now();

  try {
    logger.info("Starting notification send job");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First, process any batched notifications that are ready
    logger.info("Processing batched notifications");
    const { data: batchedCount, error: batchError } = await supabase
      .rpc("process_batched_notifications");

    if (batchError) {
      logger.warn("Error processing batched notifications", { error: batchError.message });
    } else if (batchedCount > 0) {
      logger.info("Processed batched notifications", { count: batchedCount });
    }

    // Fetch pending notifications (limit 100 per run)
    logger.info("Fetching pending notifications");
    const { data: notifications, error: fetchError } = await supabase
      .rpc("get_pending_notifications", { limit_count: 100 });

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      logger.info("No pending notifications");
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          message: "No pending notifications",
          duration_ms: Date.now() - startTime,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    logger.info("Found pending notifications", { count: notifications.length });

    // Build Expo push messages
    const messages: ExpoPushMessage[] = [];
    const notificationMap = new Map<number, PendingNotification>(); // Map message index to notification

    for (const notification of notifications as PendingNotification[]) {
      // Skip if no valid tokens
      if (!notification.tokens || notification.tokens.length === 0) {
        logger.warn("No tokens for notification", { notification_id: notification.notification_id });
        continue;
      }

      // Create a message for each token (user may have multiple devices)
      for (const token of notification.tokens) {
        // Validate Expo push token format
        if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
          logger.warn("Invalid token format", { token: token.substring(0, 20) });
          continue;
        }

        const messageIndex = messages.length;
        notificationMap.set(messageIndex, notification);

        messages.push({
          to: token,
          title: notification.title,
          body: notification.body,
          data: {
            ...notification.data,
            type: notification.type,
            notification_id: notification.notification_id,
          },
          sound: "default",
          channelId: getChannelId(notification.type),
          priority: getPriority(notification.type),
        });
      }
    }

    if (messages.length === 0) {
      logger.warn("No valid messages to send");
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          message: "No valid tokens found",
          duration_ms: Date.now() - startTime,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Send to Expo
    logger.info("Sending to Expo Push API", { messageCount: messages.length });
    const tickets = await sendToExpo(messages);

    // Process results
    const successIds: string[] = [];
    const failedIds: string[] = [];
    const invalidTokens: string[] = [];

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const notification = notificationMap.get(i);

      if (!notification) continue;

      if (ticket.status === "ok") {
        if (!successIds.includes(notification.notification_id)) {
          successIds.push(notification.notification_id);
        }
      } else {
        // Check for invalid token error
        if (ticket.details?.error === "DeviceNotRegistered") {
          invalidTokens.push(messages[i].to);
        }

        if (!failedIds.includes(notification.notification_id)) {
          failedIds.push(notification.notification_id);
        }

        logger.warn("Push failed", {
          notification_id: notification.notification_id,
          error: ticket.message || ticket.details?.error,
        });
      }
    }

    // Mark successful notifications as sent
    if (successIds.length > 0) {
      const { error: markError } = await supabase
        .rpc("mark_notification_sent", {
          notification_ids: successIds,
          success: true,
        });

      if (markError) {
        logger.error("Failed to mark notifications as sent", markError);
      }
    }

    // Mark failed notifications (will retry up to 3 times)
    if (failedIds.length > 0) {
      // Remove successes from failures (some tokens might work, others fail)
      const pureFailures = failedIds.filter((id) => !successIds.includes(id));

      if (pureFailures.length > 0) {
        const { error: markError } = await supabase
          .rpc("mark_notification_sent", {
            notification_ids: pureFailures,
            success: false,
            error_message: "Push delivery failed",
          });

        if (markError) {
          logger.error("Failed to mark notifications as failed", markError);
        }
      }
    }

    // Deactivate invalid tokens
    if (invalidTokens.length > 0) {
      logger.info("Deactivating invalid tokens", { count: invalidTokens.length });

      for (const token of invalidTokens) {
        await supabase
          .from("push_tokens")
          .update({ is_active: false })
          .eq("token", token);
      }
    }

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      sent: successIds.length,
      failed: failedIds.filter((id) => !successIds.includes(id)).length,
      batched_processed: batchedCount || 0,
      invalid_tokens_deactivated: invalidTokens.length,
      duration_ms: duration,
    };

    logger.success("Notification send complete", duration, result);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Fatal error sending notifications", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
