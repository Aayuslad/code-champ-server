import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

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

        console.log("Contest statuses updated successfully.");
    } catch (error) {
        console.error("Error updating contest statuses:", error);
    }
};

// Schedule the cron job to run every minute
cron.schedule("* * * * *", updateContestStatus);

console.log("Contest status cron job started...");
