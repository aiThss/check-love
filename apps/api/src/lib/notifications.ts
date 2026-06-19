import webPush from "web-push";
import { env } from "../config/env";
import { PushSubscription } from "../models";

let configured = false;

export function configureWebPush() {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;
  webPush.setVapidDetails(
    `mailto:${env.SMTP_USER ?? "hello.couple@gmail.com"}`,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
  configured = true;
}

export async function notifyPartnerCheckIn(coupleId: string, ownerId: string) {
  if (!configured) return;

  const subscriptions = await PushSubscription.find({
    coupleId,
    userId: { $ne: ownerId }
  }).lean();

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys
        },
        JSON.stringify({
          title: "LoveCheck",
          body: "Co check-in moi tu nguoi ay.",
          url: "/app/home"
        })
      );
    })
  );
}
