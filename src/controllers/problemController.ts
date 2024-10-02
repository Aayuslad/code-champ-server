import { PrismaClient } from "@prisma/client";
import {
	contributeProblemSchema,
	FunctionStructureType,
	putOngoingProblemSchma,
	sumitSolutionSchema,
	TestCaseType,
} from "@aayushlad/code-champ-common";
import axios from "axios";
import { Request, Response } from "express";
import { idToLanguageMappings } from "../config/languageIdmappings";
import { generateUniqueSlug } from "../helper/generateUniqueSlug";
import { getObjectFromS3, uploadJsonToS3 } from "../services/awsS3";
import { generateBoilerplate } from "../services/boilerplateGenerator/boilerplateGenerator";
import { generateSubmissionCode } from "../services/boilerplateGenerator/submissionCodeGenerator";
import { stdinGenerator } from "../services/stdinGenerator";
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
		} = parsed.data;

		const slug = await generateUniqueSlug(title);

		await Promise.all([
			uploadJsonToS3(`problem-test-cases/${slug}/sampleTestCases.json`, sampleTestCases),
			uploadJsonToS3(`problem-test-cases/${slug}/testCases.json`, testCases),
		]);

		const boilerplateCode = generateBoilerplate(functionStructure);
		const submissionCode = generateSubmissionCode(functionStructure);

		const topicTagIdsToAdd = await Promise.all(
			topicTags
				.filter((tag) => tag.trim())
				.map(async (tag) => {
					const existingTag = await prisma.topicTag.findFirst({ where: { content: tag } });
					if (existingTag) {
						return existingTag.id;
					} else {
						const newTag = await prisma.topicTag.create({ data: { content: tag } });
						return newTag.id;
					}
				}),
		);

		const newProblem = await prisma.problem.create({
			data: {
				title,
				problemNumber: 4,
				slug: slug,
				description: description,
				difficultyLevel: difficultyLevel,
				sampleTestCasesKey: `problem-test-cases/${slug}/sampleTestCases.json`,
				testCasesKey: `problem-test-cases/${slug}/testCases.json`,
				boilerplateCode: JSON.stringify(boilerplateCode),
				submissionCode: JSON.stringify(submissionCode),
				testCasesCount: testCases.length || 0,
				functionStructure: JSON.stringify(functionStructure),
				constraints: {
					create: constraints.map((constraint: string) => ({
						content: constraint,
					})),
				},
				topicTags: {
					connect: topicTagIdsToAdd.map((id) => ({ id })),
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
	try {
		const problems = await prisma.problem.findMany({
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
			},
		});

		const editedProblems = problems.map((problem) => {
			const acceptanceRate =
				problem.submissionCount > 0 ? ((problem.acceptedSubmissions / problem.submissionCount) * 100).toFixed(2) : "0.00";

			return {
				id: problem.id,
				problemNumber: problem.problemNumber,
				title: problem.title,
				difficulty: problem.difficultyLevel,
				acceptanceRate: `${acceptanceRate}%`,
			};
		});

		return res.status(200).json(editedProblems);
	} catch (err) {
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
}

export async function getProblem(req: Request, res: Response) {
	const { id } = req.params;
	const { userId } = req.query as { userId: string };

	try {
		const problem = await prisma.problem.findFirst({
			where: { id },
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

		if (userId) {
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
			constraints: problem.constraints.map((constraint) => constraint.content),
			hints: problem.hints.map((hint) => hint.content),
			topicTags: problem.topicTags.map((tag) => tag.content),
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
		console.log(err);
		

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
			},
		});

		if (!problem) return res.status(404).json({ message: "Problem not found" });

		const testCases: TestCaseType[] = JSON.parse(await getObjectFromS3(problem.testCasesKey));
		const functionStructure: FunctionStructureType = JSON.parse(problem.functionStructure);
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
				createdById: req.user?.id || "",
			},
		});

		const response = await axios.post("https://codesandbox.code-champ.xyz/submit-batch-task", {
			submissionId: submission.id,
			callbackUrl: `https://code-champ-webhook-handler.vercel.app/submit-task-callback`,
			languageId: languageId,
			code: encodedFinalCode,
			tasks: testCases.map((testCase, index) => ({
				id: index,
				stdin: stdinGenerator(functionStructure, testCase),
				expectedOutput: testCase.output,
				inputs: JSON.stringify(testCase.input),
			})),
		});

		return res.status(200).json({
			message: "Solution submitted successfully",
			taskId: response.data.batchTaskId,
		});
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
		const result = await axios.get(`https://codesandbox.code-champ.xyz/batch-task-status/${taskId}`);

		const editedResult = {
			...result.data,
			problemId,
			tasks:
				result.data.tasks?.map((task: any) => ({
					...task,
					expectedOutput: JSON.parse(task.expectedOutput),
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
			},
		});

		return res.status(200).json(submission);
	} catch (err) {
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
}
