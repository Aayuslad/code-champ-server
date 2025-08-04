import { PrismaClient } from "@prisma/client";
import { putOngoingContestProblemSchma, sumitContestSolutionSchema, TestCaseType } from "@aayushlad/code-champ-common";
import axios from "axios";
import { Request, Response } from "express";
import { idToLanguageMappings } from "../config/languageIdmappings";
import { getObjectFromS3, getSignedS3URL } from "../services/awsS3";
const prisma = new PrismaClient();

export async function getContestProblem(req: Request, res: Response) {
    const { contestProblemId, participantId } = req.params;

    try {
        const problem = await prisma.contestProblem.findFirst({
            where: { id: contestProblemId },
            select: {
                id: true,
                order: true,
                points: true,
                problem: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        difficultyLevel: true,
                        sampleTestCasesKey: true,
                        constraints: { select: { content: true } },
                        topicTags: { select: { content: true } },
                        hints: { select: { content: true } },
                        boilerplateCode: true,
                        testCasesCount: true,
                        createdBy: {
                            select: {
                                id: true,
                                userName: true,
                                profileImg: true,
                            },
                        },
                    },
                },
            },
        });

        const { id, ...updatedProblem } = {
            ...problem?.problem,
            contestProblemId: problem?.id,
            problemId: problem?.problem.id,
            order: problem?.order,
            points: problem?.points,
        };

        console.log(updatedProblem);

        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        let solutions = "";

        if (participantId && participantId !== "undefined") {
            const ongoingProblem = await prisma.ongoingContestProblem.findFirst({
                where: {
                    participantId,
                    contestProblemId,
                },
                select: {
                    solutions: true,
                },
            });

            solutions = ongoingProblem?.solutions || "";
        }

        const parsedSolutions = JSON.parse(solutions || "[]");

        const sampleTestCasesJson = await getObjectFromS3(updatedProblem.sampleTestCasesKey as string);
        const parsedTestCases: TestCaseType[] = JSON.parse(sampleTestCasesJson);

        const { sampleTestCasesKey, ...editedProblem } = {
            ...updatedProblem,
            exampleTestCases: parsedTestCases,
            constraints: updatedProblem?.constraints?.map(constraint => constraint.content),
            hints: updatedProblem?.hints?.map(hint => hint.content),
            topicTags: updatedProblem?.topicTags?.map(tag => tag.content),
            boilerplateCode: JSON.parse(updatedProblem.boilerplateCode as string),
            solutions: parsedSolutions,
        };

        return res.status(200).json(editedProblem);
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function putOngoingContestProblem(req: Request, res: Response) {
    try {
        const parsed = putOngoingContestProblemSchma.safeParse(req.body);
        if (!parsed.success) return res.status(422).json({ message: "Invalid data" });

        const { contestProblemId, participantId, solutions } = parsed.data;

        const existingProblem = await prisma.ongoingContestProblem.findFirst({
            where: { contestProblemId, participantId },
        });

        if (!existingProblem) {
            await prisma.ongoingContestProblem.create({
                data: {
                    contestProblemId,
                    participantId,
                    solutions,
                },
            });
        } else {
            await prisma.ongoingContestProblem.update({
                where: { id: existingProblem.id },
                data: {
                    solutions,
                },
            });
        }

        return res.sendStatus(200);
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function getOngoingContestProblem(req: Request, res: Response) {
    const { contestProblemId, participantId } = req.params;

    try {
        const ongoingContestProblem = await prisma.ongoingContestProblem.findFirst({
            where: { participantId, contestProblemId },
            select: {
                solutions: true,
            },
        });

        return res.status(200).json(ongoingContestProblem);
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function testContestSolution(req: Request, res: Response) {
    try {
        const parsed = sumitContestSolutionSchema.safeParse(req.body);
        if (!parsed.success) return res.status(422).json({ message: "Invalid data" });
        const { problemId, languageId, solutionCode } = parsed.data;

        const problem = await prisma.problem.findFirst({
            where: { id: problemId },
            select: {
                id: true,
                sampleTestCasesKey: true,
                functionStructure: true,
                submissionCode: true,
                difficultyLevel: true,
            },
        });

        if (!problem) return res.status(404).json({ message: "Problem not found" });

        const parcedSubmissionCode = JSON.parse(problem.submissionCode);
        const solutionCodee = parcedSubmissionCode[idToLanguageMappings[languageId] as string];
        const finalCode = solutionCodee.replace("{solution_code}", solutionCode);
        const encodedFinalCode = Buffer.from(finalCode).toString("base64");

        const id = Math.random().toString(36).substring(7);

        const response = await axios.post(`${process.env.CODESANDBOX_HOST}/submit-batch-task`, {
            submissionId: id,
            languageId: languageId,
            code: encodedFinalCode,
            functionStructure: problem.functionStructure,
            testCaseURL: await getSignedS3URL(problem.sampleTestCasesKey),
        });

        res.status(200).json({
            message: "Solution submitted successfully",
            taskId: response.data.batchTaskId,
        });

        return;
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function submitContestSolution(req: Request, res: Response) {
    try {
        const parsed = sumitContestSolutionSchema.safeParse(req.body);
        if (!parsed.success) return res.status(422).json({ message: "Invalid data" });
        const { problemId, contestProblemId, participantId, languageId, solutionCode } = parsed.data;

        const problem = await prisma.problem.findFirst({
            where: { id: problemId },
            select: {
                id: true,
                testCasesKey: true,
                functionStructure: true,
                submissionCode: true,
                difficultyLevel: true,
            },
        });

        if (!problem) return res.status(404).json({ message: "Problem not found" });

        const parcedSubmissionCode = JSON.parse(problem.submissionCode);
        const solutionCodee = parcedSubmissionCode[idToLanguageMappings[languageId] as string];
        const finalCode = solutionCodee.replace("{solution_code}", solutionCode);
        const encodedFinalCode = Buffer.from(finalCode).toString("base64");

        const submission = await prisma.contestSubmission.create({
            data: {
                contestProblemId,
                code: solutionCode,
                languageId: languageId.toString(),
                status: "Pending",
                difficultyLevel: problem.difficultyLevel,
                createdByParticipantId: participantId,
            },
        });

        //#TODO: create new route for this in weebhook handler
        const response = await axios.post(`${process.env.CODESANDBOX_HOST}/submit-batch-task`, {
            submissionId: submission.id,
            languageId: languageId,
            code: encodedFinalCode,
            callbackUrl: `https://code-champ-webhook-handler.vercel.app/submit-contest-task-callback`,
            functionStructure: problem.functionStructure,
            testCaseURL: await getSignedS3URL(problem.testCasesKey),
        });

        res.status(200).json({
            message: "Solution submitted successfully",
            taskId: response.data.batchTaskId,
        });

        return;
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function checkContestBatchSubmission(req: Request, res: Response) {
    try {
        const { taskId, contestProblemId } = req.params;
        const result = await axios.get(`${process.env.CODESANDBOX_HOST}/batch-task-status/${taskId}`);

        const editedResult = {
            ...result.data,
            contestProblemId,
            tasks:
                result.data.tasks?.map((task: any) => ({
                    ...task,
                    expectedOutput: task.expectedOutput,
                    inputs: JSON.parse(task.inputs),
                })) || [],
        };
        return res.json(editedResult);
    } catch (err) {
        console.log(err);

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function getContestSubmissions(req: Request, res: Response) {
    try {
        const { contestProblemId, participantId } = req.params;

        const submission = await prisma.contestSubmission.findMany({
            where: {
                createdByParticipantId: participantId,
                contestProblemId,
            },
            orderBy: {
                createdAt: "desc",
            },
            select: {
                id: true,
                code: true,
                languageId: true,
                status: true,
                createdAt: true,
                points: true,
            },
        });

        return res.status(200).json(submission);
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}
