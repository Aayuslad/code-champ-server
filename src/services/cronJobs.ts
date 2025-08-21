import cron from "node-cron";
import { prisma } from "../lib/prisma";
import logger from "../lib/logger";

const updateContestStatus = async () => {
    const now = new Date();

    try {
        // Update contests from "Scheduled" to "Ongoing"
        await prisma.contest.updateMany({
            where: {
                status: "Scheduled",
                startTime: { lte: now }, // startTime <= now
            },
            data: { status: "Ongoing" },
        });

        // Update contests from "Ongoing" to "Completed"
        await prisma.contest.updateMany({
            where: {
                status: "Ongoing",
                endTime: { lte: now }, // endTime <= now
            },
            data: { status: "Completed" },
        });

        logger.info("Contest statuses updated successfully.");
    } catch (error) {
        logger.error("Error updating contest statuses:", error);
    }
};

// Schedule the cron job to run every minute
cron.schedule("* * * * *", updateContestStatus);

logger.info("Contest status cron job started...");
