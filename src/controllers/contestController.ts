import { createContestSchma, registerUserForContestSchema } from "@aayushlad/code-champ-common";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma";
import logger from "../lib/logger";

// create contest
export const createContest = async (req: Request, res: Response) => {
    try {
        const parced = createContestSchma.safeParse(req.body);
        if (!parced.success) {
            return res.status(400).json({ error: parced.error });
        }

        const { title, description, startTime, endTime, visibility, problems, points, durationMs, bestOf } = parced.data;

        const currentDate = new Date();
        if (new Date(startTime) <= currentDate) {
            return res.status(400).json({ message: "Start time must be after current time" });
        }

        if (new Date(endTime) <= new Date(startTime)) {
            return res.status(400).json({ message: "End time must be after start time" });
        }

        const uniqueTitle = title + " " + Date.now();

        await prisma.contest.create({
            data: {
                title: uniqueTitle,
                description,
                startTime,
                endTime,
                status: "Scheduled",
                visibility,
                durationMs,
                linkToken: uuidv4(),
                createdById: req?.user?.id as string,
                points,
                bestOf: bestOf || 0, // Default to 0 if not provided
                problems: {
                    create: problems.map(problem => ({
                        problemId: problem.problemId,
                        points: problem.points,
                        order: problem.order,
                    })),
                },
            },
        });

        return res.status(201).json({ message: "Contest created successfully" });
    } catch (err) {
        logger.error(err);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

// get public contests
export const getFeedContests = async (req: Request, res: Response) => {
    const userId = req.params.userId;

    try {
        const upcomming = await prisma.contest.findMany({
            where: {
                visibility: "Public",
                status: "Scheduled",
            },
            select: {
                id: true,
                title: true,
                status: true,
                startTime: true,
                endTime: true,
            },
        });

        const live = await prisma.contest.findMany({
            where: {
                visibility: "Public",
                status: "Ongoing",
            },
            select: {
                id: true,
                title: true,
                status: true,
                startTime: true,
                endTime: true,
            },
        });

        const completed = await prisma.contest.findMany({
            where: {
                visibility: "Public",
                status: "Completed",
            },
            select: {
                id: true,
                title: true,
                status: true,
                startTime: true,
                endTime: true,
            },
        });

        let completedByYou, registerd;
        if (userId) {
            completedByYou = await prisma.contest.findMany({
                where: {
                    participants: {
                        some: {
                            userId,
                        },
                    },
                    status: "Completed",
                },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    startTime: true,
                    endTime: true,
                },
            });

            registerd = await prisma.contest.findMany({
                where: {
                    participants: {
                        some: {
                            userId,
                        },
                    },
                    status: {
                        in: ["Ongoing", "Scheduled"],
                    },
                },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    startTime: true,
                    endTime: true,
                },
            });
        }

        return res.status(200).json({
            upcomming,
            live,
            registerd,
            completed,
            completedByYou,
        });
    } catch (err) {
        logger.error(err);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const getContestRegisterDetails = async (req: Request, res: Response) => {
    const { contestId, userId } = req.params;

    try {
        let contest = await prisma.contest.findUnique({
            where: {
                id: contestId,
            },
            select: {
                id: true,
                title: true,
                description: true,
                startTime: true,
                endTime: true,
                durationMs: true,
                status: true,
                createdBy: {
                    select: {
                        id: true,
                        userName: true,
                        profileImg: true,
                        avatar: true,
                    },
                },
            },
        });

        if (!contest) {
            return res.status(500).json({ message: "Contest not found" });
        }

        const existingParticipant = userId
            ? await prisma.contestParticipant.findFirst({
                  where: {
                      contestId,
                      userId: userId as string,
                  },
              })
            : null;

        const contestWithRegistration = {
            ...contest,
            isRegistered: existingParticipant ? true : false,
            joinedAt: existingParticipant?.joinedAt || null,
        };

        return res.status(200).json(contestWithRegistration);
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const registerUserForContest = async (req: Request, res: Response) => {
    const { contestId } = req.params;

    try {
        const parced = registerUserForContestSchema.safeParse(req.body);
        if (!parced.success) {
            return res.status(400).json({ error: parced.error });
        }
        const { enrollmentNum } = parced.data;

        if (!contestId) {
            return res.status(400).json({ message: "Invalid contest ID" });
        }

        const existingParticipant = await prisma.contestParticipant.findFirst({
            where: {
                contestId,
                userId: req?.user?.id as string,
            },
        });

        if (existingParticipant) {
            return res.status(400).json({ message: "You have already registered for this contest" });
        }

        await prisma.contestParticipant.create({
            data: {
                contestId,
                enrollmentNum: String(enrollmentNum),
                userId: req?.user?.id as string,
                score: 0,
            },
        });

        return res.status(200).json({ message: "User registered for contest" });
    } catch (err) {
        logger.error(err);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const getLiveContestDetails = async (req: Request, res: Response) => {
    try {
        const { contestId } = req.params;

        if (!contestId) {
            return res.status(400).json({ message: "invalid contest Id" });
        }

        // only if user has registerd for contest
        const isParticipant = await prisma.contestParticipant.findFirst({
            where: {
                contestId: contestId,
                userId: req.user?.id,
            },
        });

        if (!isParticipant) {
            return res.status(400).json({ message: "You haven't registerd" });
        }

        const liveContest = await prisma.contest.findFirst({
            where: {
                id: contestId,
                status: "Ongoing",
            },
            select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                durationMs: true,
                bestOf: true,
                problems: {
                    select: {
                        id: true,
                        points: true,
                        order: true,
                        problem: {
                            select: {
                                title: true,
                                testCasesCount: true,
                                id: true,
                            },
                        },
                    },
                },
                participants: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                profileImg: true,
                                avatar: true,
                                userName: true,
                            },
                        },
                        enrollmentNum: true,
                        score: true,
                    },
                },
            },
        });

        const { participants, ...flatenedContest } = {
            ...liveContest,
            participantId: isParticipant?.id,
            yourScore: isParticipant?.score,
            joinedAt: isParticipant?.joinedAt,
            problems: liveContest?.problems
                ? await Promise.all(
                      liveContest.problems.map(async problem => {
                            let attemptState = "Not Attempted";

                            // fetch the last submission for the problem
                            const lastSubmission = await prisma.contestSubmission.findFirst({
                                where: {
                                    contestProblemId: problem.id,
                                    createdByParticipantId: isParticipant?.id,
                                },
                                orderBy: {
                                    createdAt: "desc",
                                },
                            });

                            // if state is accepted the accepted
                            if (lastSubmission && lastSubmission?.status === "Accepted") {
                                attemptState = "Accepted";
                            }
                            // if other then attempted
                            if (lastSubmission && lastSubmission?.status !== "Accepted") {
                                attemptState = "Attempted";
                            }
                            // if not fonud then not attempted
                          
                          return {
                              points: problem.points,
                              scoredPoints: lastSubmission?.points || 0,
                              order: problem.order,
                              testCasesCount: problem.problem.testCasesCount,
                              contestProblemId: problem.id,
                              problemId: problem.problem.id,
                              title: problem.problem.title,
                              attemptState: attemptState,
                          };
                      }),
                  )
                : [],
            leaderBoard:
                liveContest?.participants?.map(participant => {
                    return {
                        userId: participant.user.id,
                        userName: participant.user.userName || "",
                        profileImg: participant.user.profileImg || "",
                        avatar: participant.user.avatar || "",
                        score: participant.score,
                        enrollmentNum: participant.enrollmentNum || "",
                    };
                }) || [],
        };

        flatenedContest.problems?.forEach(problem => {
            if ("problem" in problem) {
                delete (problem as any).problem;
            }
        });

        return res.status(200).json(flatenedContest);
    } catch (err) {
        logger.error(err);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

export const getLeaderBard = async (req: Request, res: Response) => {
    const { contestId } = req.params;

    try {
        const leaderBoard = await prisma.contestParticipant.findMany({
            where: {
                contestId,
            },
            select: {
                user: {
                    select: {
                        id: true,
                        userName: true,
                        avatar: true,
                        profileImg: true,
                    },
                },
                score: true,
                enrollmentNum: true,
            },
            orderBy: {
                score: "desc",
            },
        });

        const normalizedLeaderBoard = leaderBoard.map(entry => ({
            userId: entry.user.id,
            userName: entry.user.userName,
            profileImg: entry.user.profileImg,
            avatar: entry.user.avatar,
            score: entry.score,
            enrollmentNum: entry.enrollmentNum,
        }));

        return res.status(200).json(normalizedLeaderBoard);
    } catch (err) {
        logger.error(err);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};
