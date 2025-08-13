import { PrismaClient } from "@prisma/client";
import {
    contributeProblemSchema,
    contrubuteTestCasesSchema,
    putOngoingProblemSchma,
    sumitSolutionSchema,
    TestCaseType,
} from "@aayushlad/code-champ-common";
import axios from "axios";
import { Request, Response } from "express";
import { idToLanguageMappings } from "../config/languageIdmappings";
import { generateUniqueSlug } from "../helper/generateUniqueSlug";
import { checkAuth } from "../middlewares/adminMiddleware";
import { getObjectFromS3, getSignedS3URL, uploadJsonToS3 } from "../services/awsS3";
const prisma = new PrismaClient();

export async function contributeProblem(req: Request, res: Response) {
    try {
        const parsed = contributeProblemSchema.safeParse(req.body);
        if (!parsed.success) return res.status(422).json({ message: "Invalid data" });

        const {
            title,
            difficultyLevel,
            description,
            sampleTestCases,
            testCases,
            functionStructure,
            topicTags,
            hints,
            constraints,
            visibility,
        } = parsed.data;

        const slug = await generateUniqueSlug(title);

        await Promise.all([
            uploadJsonToS3(`problem-test-cases/${slug}/sampleTestCases.json`, sampleTestCases),
            uploadJsonToS3(`problem-test-cases/${slug}/testCases.json`, testCases),
        ]);

        const existingTags = await prisma.topicTag.findMany({
            where: {
                content: {
                    in: topicTags.map(tag => tag.trim()),
                },
            },
        });

        if (existingTags.length !== topicTags.length) {
            return res.status(400).json({
                message: "One or more topic tags do not exist",
            });
        }

        let problemNumber = null;
        if (visibility === "Public") {
            const bigestProblemNum = (await prisma.problem.findFirst({
                where: {
                    problemNumber: {
                        not: null,
                    },
                },
                select: {
                    problemNumber: true,
                },
                orderBy: {
                    problemNumber: "desc",
                },
            })) as { problemNumber: number } | null;
            problemNumber = bigestProblemNum ? bigestProblemNum.problemNumber + 1 : 1;
        }

        const newProblem = await prisma.problem.create({
            data: {
                title,
                problemNumber,
                slug: slug,
                description: description,
                difficultyLevel: difficultyLevel,
                sampleTestCasesKey: `problem-test-cases/${slug}/sampleTestCases.json`,
                testCasesKey: `problem-test-cases/${slug}/testCases.json`,
                boilerplateCode: req.body.boilerplateCode,
                submissionCode: req.body.submissionCode,
                testCasesCount: testCases.length || 0,
                functionStructure: JSON.stringify(functionStructure),
                visibility,
                constraints: {
                    create: constraints.map((constraint: string) => ({
                        content: constraint,
                    })),
                },
                topicTags: {
                    connect: existingTags.map(tag => ({ id: tag.id })),
                },
                hints: {
                    create: hints.map((hint: string) => ({
                        content: hint,
                    })),
                },
                createdBy: {
                    connect: {
                        id: req.user?.id,
                    },
                },
            },
        });

        res.status(201).json({
            message: "Problem created successfully",
            problem: newProblem,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function getFeedProblems(req: Request, res: Response) {
    const { userId } = req.query;

    try {
        if (userId && userId !== "undefined" && userId !== "null" && userId !== "") {
            await checkAuth(req);
        }

        let problems = await prisma.problem.findMany({
            where: {
                OR: [
                    { visibility: "Public", approved: true },
                    { visibility: "Private", approved: false, createdById: userId as string },
                ],
            },
            take: 50,
            orderBy: {
                problemNumber: "asc",
            },
            select: {
                id: true,
                problemNumber: true,
                title: true,
                difficultyLevel: true,
                submissionCount: true,
                acceptedSubmissions: true,
                topicTags: {
                    select: {
                        content: true,
                    },
                },
            },
        });

        let solvedProblems: { problemId: string }[] = [];

        if (userId && userId !== "undefined") {
            solvedProblems = await prisma.submission.findMany({
                where: {
                    problemId: {
                        in: problems.map(problem => problem.id),
                    },
                    createdById: userId as string,
                    status: "Accepted",
                },
            });
        }

        const editedProblems = problems.map(problem => {
            const acceptanceRate =
                problem.submissionCount > 0 ? ((problem.acceptedSubmissions / problem.submissionCount) * 100).toFixed(2) : "0.00";

            const status = !!solvedProblems.find(solvedProblem => solvedProblem.problemId === problem.id);

            return {
                id: problem.id,
                problemNumber: problem.problemNumber,
                title: problem.title,
                difficulty: problem.difficultyLevel,
                acceptanceRate: `${acceptanceRate}%`,
                topicTags: problem.topicTags.map(tag => tag.content),
                isSolved: status,
            };
        });

        return res.status(200).json(editedProblems);
    } catch (err: any) {
        if (err.name === "UnauthorizedError" || err.status === 401) {
            return res.status(401).json({ message: err.message });
        }
        return res.status(500).json({ message: "Internal Server Error" });
    }
}



export async function getProblem(req: Request, res: Response) {
    const { id } = req.params;
    const { userId } = req.query as { userId: string };

    try {
         if (userId && userId !== "undefined" && userId !== "null" && userId !== "") {
            await checkAuth(req);
        }

        const problem = await prisma.problem.findFirst({
            where: {
                id,
                OR: [
                    { visibility: "Public", approved: true },
                    { visibility: "Private", createdById: userId },
                ],
            },
            select: {
                id: true,
                problemNumber: true,
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
                submissionCount: true,
                acceptedSubmissions: true,
            },
        });

        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        let solutions = "";

        if (userId && userId !== "undefined") {
            const ongoingProblem = await prisma.ongoingProblem.findFirst({
                where: {
                    userId: userId,
                    problemId: id,
                },
                select: {
                    solutions: true,
                },
            });

            solutions = ongoingProblem?.solutions || "";
        }

        const parsedSolutions = JSON.parse(solutions || "[]");

        const sampleTestCasesJson = await getObjectFromS3(problem.sampleTestCasesKey);
        const parsedTestCases: TestCaseType[] = JSON.parse(sampleTestCasesJson);

        const acceptanceRate =
            problem.submissionCount > 0 ? ((problem.acceptedSubmissions / problem.submissionCount) * 100).toFixed(2) : "0.00";

        const { sampleTestCasesKey, ...editedProblem } = {
            ...problem,
            exampleTestCases: parsedTestCases,
            acceptanceRate,
            constraints: problem.constraints.map(constraint => constraint.content),
            hints: problem.hints.map(hint => hint.content),
            topicTags: problem.topicTags.map(tag => tag.content),
            boilerplateCode: JSON.parse(problem.boilerplateCode),
            solutions: parsedSolutions,
        };

        return res.status(200).json(editedProblem);
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function putOngoingProblem(req: Request, res: Response) {
    try {
        const parsed = putOngoingProblemSchma.safeParse(req.body);
        if (!parsed.success) return res.status(422).json({ message: "Invalid data" });

        const { problemId, solutions } = parsed.data;

        const existingProblem = await prisma.ongoingProblem.findFirst({
            where: { problemId, userId: req.user?.id },
        });

        if (!existingProblem) {
            await prisma.ongoingProblem.create({
                data: {
                    problemId,
                    userId: req.user?.id as string,
                    solutions,
                },
            });
        } else {
            await prisma.ongoingProblem.update({
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

export async function getOngoingProblem(req: Request, res: Response) {
    const { problemId } = req.params;

    try {
        const ongoingProblem = await prisma.ongoingProblem.findFirst({
            where: { userId: req.user?.id, problemId },
            select: {
                solutions: true,
            },
        });

        return res.status(200).json(ongoingProblem);
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function testSolution(req: Request, res: Response) {
    try {
        const parsed = sumitSolutionSchema.safeParse(req.body);
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

export async function submitSolution(req: Request, res: Response) {
    try {
        const parsed = sumitSolutionSchema.safeParse(req.body);
        if (!parsed.success) return res.status(422).json({ message: "Invalid data" });
        const { problemId, languageId, solutionCode } = parsed.data;

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

        const submission = await prisma.submission.create({
            data: {
                problemId: problemId,
                code: solutionCode,
                languageId: languageId.toString(),
                status: "Pending",
                difficultyLevel: problem.difficultyLevel,
                createdById: req.user?.id || "",
            },
        });

        const response = await axios.post(`${process.env.CODESANDBOX_HOST}/submit-batch-task`, {
            submissionId: submission.id,
            languageId: languageId,
            code: encodedFinalCode,
            callbackUrl: `https://code-champ-webhook-handler.vercel.app/submit-task-callback`,
            functionStructure: problem.functionStructure,
            testCaseURL: await getSignedS3URL(problem.testCasesKey),
        });

        res.status(200).json({
            message: "Solution submitted successfully",
            taskId: response.data.batchTaskId,
        });

        await prisma.problem.update({
            where: { id: problemId },
            data: {
                submissionCount: {
                    increment: 1,
                },
            },
        });

        return;
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function checkBatchSubmission(req: Request, res: Response) {
    try {
        const { taskId, problemId } = req.params;
        const result = await axios.get(`${process.env.CODESANDBOX_HOST}/batch-task-status/${taskId}`);

        const editedResult = {
            ...result.data,
            problemId,
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

export async function getSubmissions(req: Request, res: Response) {
    try {
        const { problemId } = req.params;

        const submission = await prisma.submission.findMany({
            where: {
                createdById: req.user?.id || "",
                problemId: problemId,
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

export async function getProblemsBySearch(req: Request, res: Response) {
    const searchQurey = req.query.query as string;
    try {
        const isNumber = !isNaN(parseInt(searchQurey));
        let problems: any = [];

        if (isNumber) {
            problems = await prisma.problem.findMany({
                where: {
                    problemNumber: parseInt(searchQurey),
                    visibility: "Public",
                    approved: true,
                },
                select: {
                    id: true,
                    problemNumber: true,
                    title: true,
                    difficultyLevel: true,
                },
            });
        } else {
            problems = await prisma.problem.findMany({
                where: {
                    title: {
                        contains: searchQurey,
                    },
                },
                select: {
                    id: true,
                    problemNumber: true,
                    title: true,
                    difficultyLevel: true,
                },
            });
        }

        return res.status(200).json(problems);
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function getProblemForContribution(req: Request, res: Response) {
    const { problemId } = req.params;

    try {
        const problem = await prisma.problem.findFirst({
            where: { id: problemId, visibility: "Public", approved: true },
            select: {
                id: true,
                problemNumber: true,
                title: true,
                description: true,
                difficultyLevel: true,
                sampleTestCasesKey: true,
                testCasesKey: true,
                constraints: { select: { content: true } },
                topicTags: { select: { content: true } },
                hints: { select: { content: true } },
                testCasesCount: true,
                functionStructure: true,
                createdBy: {
                    select: {
                        id: true,
                        userName: true,
                        profileImg: true,
                    },
                },
                submissionCount: true,
                acceptedSubmissions: true,
            },
        });

        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        const sampleTestCasesJson = await getObjectFromS3(problem.sampleTestCasesKey);
        const testCasesJson = await getObjectFromS3(problem.testCasesKey);
        const parsedsampleTestCases: TestCaseType[] = JSON.parse(sampleTestCasesJson);
        const parsedTestCases: TestCaseType[] = JSON.parse(testCasesJson);

        const acceptanceRate =
            problem.submissionCount > 0 ? ((problem.acceptedSubmissions / problem.submissionCount) * 100).toFixed(2) : "0.00";

        const { sampleTestCasesKey, testCasesKey, ...editedProblem } = {
            ...problem,
            acceptanceRate,
            constraints: problem.constraints.map(constraint => constraint.content),
            hints: problem.hints.map(hint => hint.content),
            topicTags: problem.topicTags.map(tag => tag.content),
            functionStructure: JSON.parse(problem.functionStructure),
            exampleTestCases: parsedsampleTestCases,
            testCases: parsedTestCases,
        };

        return res.status(200).json(editedProblem);
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

export async function contrubuteTestCases(req: Request, res: Response) {
    try {
        const parsed = contrubuteTestCasesSchema.safeParse(req.body);
        if (!parsed.success) return res.status(422).json({ message: "Invalid data" });
        const { problemId, contributedTestCases } = parsed.data;

        const problem = await prisma.problem.findFirst({
            where: {
                id: problemId,
            },
            select: {
                testCasesKey: true,
                slug: true,
            },
        });

        if (!problem) return res.status(404).json({ message: "Problem not found" });

        const testCasesJson = await getObjectFromS3(problem.testCasesKey);
        const parsedTestCases: TestCaseType[] = JSON.parse(testCasesJson);

        const updatedTestCases = [...parsedTestCases, ...contributedTestCases];

        await uploadJsonToS3(`problem-test-cases/${problem.slug}/testCases.json`, updatedTestCases);

        await prisma.problem.update({
            where: {
                id: problemId,
            },
            data: {
                testCasesCount: {
                    increment: contributedTestCases.length,
                },
            },
        });

        return res.status(200).json({ message: "Test cases updated successfully" });
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}
