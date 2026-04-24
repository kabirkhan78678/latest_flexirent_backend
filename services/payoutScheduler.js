import { processDuePayouts } from "./payoutService.js";

let schedulerHandle = null;
let isRunning = false;

const getIntervalMs = () => {
  const parsed = Number(process.env.PAYOUT_SCHEDULER_INTERVAL_MS || 300000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300000;
};

const runScheduler = async () => {
  if (isRunning) return;

  isRunning = true;
  try {
    const summary = await processDuePayouts({
      limit: Number(process.env.PAYOUT_SCHEDULER_BATCH_SIZE || 20),
      triggerSource: "cron",
    });

    if (summary.total_due > 0) {
      console.log("Payout scheduler summary:", summary);
    }
  } catch (error) {
    console.error("Payout scheduler failed:", error);
  } finally {
    isRunning = false;
  }
};

export const startPayoutScheduler = () => {
  if (schedulerHandle) {
    return schedulerHandle;
  }

  if (process.env.PAYOUT_SCHEDULER_ENABLED !== "true") {
    console.log("Payout scheduler is disabled. Set PAYOUT_SCHEDULER_ENABLED=true to enable it.");
    return null;
  }

  const intervalMs = getIntervalMs();

  schedulerHandle = setInterval(runScheduler, intervalMs);
  setTimeout(runScheduler, 5000);

  console.log(`Payout scheduler started with interval ${intervalMs}ms`);
  return schedulerHandle;
};
