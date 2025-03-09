import { createContestSchma } from "@aayushlad/code-champ-common";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// create contest
export const createContest = async (req: Request, res: Response) => {
    try {
        const parced = createContestSchma.safeParse(req.body);
        if (!parced.success) {
            return res.status(400).json({ error: parced.error });
        }

        const { title, description, startTime, endTime, visibility, problems, points } = parced.data;

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
                linkToken: uuidv4(),
                createdById: req?.user?.id as string,
                points,
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
        console.log(err);
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
        console.log(err);
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
        };

        return res.status(200).json(contestWithRegistration);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};
// register user for contest
export const registerUserForContest = async (req: Request, res: Response) => {
    try {
        const { contestId } = req.params;

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
                userId: req?.user?.id as string,
                score: 0,
            },
        });

        return res.status(200).json({ message: "User registered for contest" });
    } catch (err) {
        console.log(err);
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
                problems: {
                    select: {
                        id: true,
                        points: true,
                        order: true,
                        problem: {
                            select: {
                                title: true,
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
                        score: true,
                    },
                },
            },
        });

        const { participants, ...flatenedContest } = {
            ...liveContest,
            participantId: isParticipant?.id,
            yourScore: isParticipant?.score,
            problems: liveContest?.problems
                ? await Promise.all(
                      liveContest.problems.map(async problem => {
                          const isSolved = await prisma.contestSubmission.findFirst({
                              where: {
                                  contestProblemId: problem.id,
                                  createdByParticipantId: isParticipant?.id,
                                  status: "Accepted",
                              },
                          });

                          return {
                              points: problem.points,
                              order: problem.order,
                              contestProblemId: problem.id,
                              problemId: problem.problem.id,
                              title: problem.problem.title,
                              isSolved: isSolved ? true : false,
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
        console.log(err);
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
        }));

        return res.status(200).json(normalizedLeaderBoard);
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};
