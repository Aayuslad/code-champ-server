import { FunctionStructureType, TestCaseType } from "@repo/common/zod";
import { derivedTypes } from "./derivedTypes";
import { baseTypes } from "./baseTypes";

export function generateSubmissionCode(
    structure: FunctionStructureType,
    testCase: TestCaseType,
    solutionCode: string,
    languageId: number,
) {
    switch (languageId) {
        case 1:
            return generatePython3SubmissionCode(structure, testCase, solutionCode);
        case 2:
            return generateCppSubmissionCode(structure, testCase, solutionCode);
        case 3:
            return generateJavaSubmissionCode(structure, testCase, solutionCode);
        case 4:
            return generateCSubmissionCode(structure, testCase, solutionCode);
    }
}

const generateCppSubmissionCode = (structure: FunctionStructureType, testCase: TestCaseType, solutionCode: string) => {
    let submissionCode = `
#include <iostream>
#include <vector>
using namespace std;

{solution_code}

int main() {
	{decl_init}

	{ret_type} result = {func_name}({args});

	{print_result}

	return 0;
}`;
    submissionCode = submissionCode.replace("{solution_code}", solutionCode);

    // adding varible declaration and initialization for function parameters
    const declInit = structure.parameters
        .map((p, index) => {
            const bType = baseTypes[p.baseType].cpp;
            if (p.category === "derived" && p.derivedType) {
                const dType = derivedTypes[p.derivedType].cpp;
                const type = dType.replace("{baseType}", bType);

                if (p.derivedType.includes("Array")) {
                    return `${type} ${p.name} = {${testCase.input[index]?.value}};`;
                }
            } else {
                return `${bType} ${p.name} = ${testCase.input[index]?.value};`;
            }
        })
        .join("\n");

    submissionCode = submissionCode.replace("{decl_init}", declInit);

    const retType =
        structure.returnType.category === "derived" && structure.returnType.derivedType
            ? derivedTypes[structure.returnType.derivedType].cpp.replace(
                  "{baseType}",
                  baseTypes[structure.returnType.baseType].cpp,
              )
            : baseTypes[structure.returnType.baseType].cpp;

    submissionCode = submissionCode.replace("{ret_type}", retType);
    submissionCode = submissionCode.replace("{func_name}", structure.functionName);
    submissionCode = submissionCode.replace("{args}", structure.parameters.map(p => p.name).join(", "));

    if (structure.returnType.category === "base" && structure.returnType.baseType) {
        submissionCode = submissionCode.replace("{print_result}", "cout << result;");
    } else {
        let printResult = "";

        if (structure.returnType.derivedType == "Array") {
            printResult = `
			for (int i = 0; i < sizeof(result) / sizeof(result[0]); i++) {
				cout << result[i] << " ";
			}
			cout << endl;
			`;
        } else {
            printResult = `
			cout << result << endl;
			`;
        }

        submissionCode = submissionCode.replace("{print_result}", printResult);
    }

    const base64SubmissionCode = Buffer.from(submissionCode).toString("base64");
    return base64SubmissionCode;
    // return submissionCode;
};

const generateCSubmissionCode = (structure: FunctionStructureType, testCase: TestCaseType, solutionCode: string) => {
    let submissionCode = `
#include <stdio.h>
#include <stdlib.h>

{solution_code}

int main() {
	{decl_init}

	{ret_type} result = {func_name}({args});

	{print_result}

	return 0;
}`;
    submissionCode = submissionCode.replace("{solution_code}", solutionCode);

    const declInit = structure.parameters
        .map((p, index) => {
            const bType = baseTypes[p.baseType].c;
            if (p.category === "derived" && p.derivedType) {
                const dType = derivedTypes[p.derivedType].c;
                const type = dType.replace("{baseType}", bType);

                if (p.derivedType.includes("Array")) {
                    return `${type} ${p.name}[] = {${testCase.input[index]?.value}};`;
                }
            } else {
                return `${bType} ${p.name} = ${testCase.input[index]?.value};`;
            }
        })
        .join("\n");

    submissionCode = submissionCode.replace("{decl_init}", declInit);

    const retType =
        structure.returnType.category === "derived" && structure.returnType.derivedType
            ? derivedTypes[structure.returnType.derivedType].c.replace("{baseType}", baseTypes[structure.returnType.baseType].c)
            : baseTypes[structure.returnType.baseType].c;

    submissionCode = submissionCode.replace("{ret_type}", retType);
    submissionCode = submissionCode.replace("{func_name}", structure.functionName);
    submissionCode = submissionCode.replace("{args}", structure.parameters.map(p => p.name).join(", "));

    if (structure.returnType.category === "base" && structure.returnType.baseType) {
        submissionCode = submissionCode.replace("{print_result}", 'printf("%d", result);');
    } else {
        let printResult = "";

        if (structure.returnType.derivedType == "Array") {
            printResult = `
			for (int i = 0; i < sizeof(result) / sizeof(result[0]); i++) {
				printf("%d ", result[i]);
			}
			printf("\\n");
			`;
        } else {
            printResult = `
			printf("%d\\n", result);
			`;
        }

        submissionCode = submissionCode.replace("{print_result}", printResult);
    }

    const base64SubmissionCode = Buffer.from(submissionCode).toString("base64");
    return base64SubmissionCode;
};

const generateJavaSubmissionCode = (structure: FunctionStructureType, testCase: TestCaseType, solutionCode: string) => {
    let submissionCode = `
import java.util.*;

public class Solution {
	{solution_code}

	public static void main(String[] args) {
		{decl_init}

		{ret_type} result = {func_name}({args});

		{print_result}
	}
}`;
    submissionCode = submissionCode.replace("{solution_code}", solutionCode);

    const declInit = structure.parameters
        .map((p, index) => {
            const bType = baseTypes[p.baseType].java;
            if (p.category === "derived" && p.derivedType) {
                const dType = derivedTypes[p.derivedType].java;
                const type = dType.replace("{baseType}", bType);

                if (p.derivedType.includes("Array")) {
                    return `${type} ${p.name} = new ${bType}[]{${testCase.input[index]?.value}};`;
                }
            } else {
                return `${bType} ${p.name} = ${testCase.input[index]?.value};`;
            }
        })
        .join("\n");

    submissionCode = submissionCode.replace("{decl_init}", declInit);

    const retType =
        structure.returnType.category === "derived" && structure.returnType.derivedType
            ? derivedTypes[structure.returnType.derivedType].java.replace(
                  "{baseType}",
                  baseTypes[structure.returnType.baseType].java,
              )
            : baseTypes[structure.returnType.baseType].java;

    submissionCode = submissionCode.replace("{ret_type}", retType);
    submissionCode = submissionCode.replace("{func_name}", structure.functionName);
    submissionCode = submissionCode.replace("{args}", structure.parameters.map(p => p.name).join(", "));

    if (structure.returnType.category === "base" && structure.returnType.baseType) {
        submissionCode = submissionCode.replace("{print_result}", "System.out.println(result);");
    } else {
        let printResult = "";

        if (structure.returnType.derivedType == "Array") {
            printResult = `
			for (int i = 0; i < result.length; i++) {
				System.out.print(result[i] + " ");
			}
			System.out.println();
			`;
        } else {
            printResult = `
			System.out.println(result);
			`;
        }

        submissionCode = submissionCode.replace("{print_result}", printResult);
    }

    const base64SubmissionCode = Buffer.from(submissionCode).toString("base64");
    return base64SubmissionCode;
};

const generatePython3SubmissionCode = (structure: FunctionStructureType, testCase: TestCaseType, solutionCode: string) => {
    let submissionCode = `
{solution_code}

if __name__ == "__main__":
	{decl_init}

	result = {func_name}({args})

	{print_result}
`;
    submissionCode = submissionCode.replace("{solution_code}", solutionCode);

    const declInit = structure.parameters
        .map((p, index) => {
            if (p.category === "derived" && p.derivedType) {
                if (p.derivedType.includes("Array")) {
                    return `${p.name} = [${testCase.input[index]?.value}]`;
                }
            } else {
                return `${p.name} = ${testCase.input[index]?.value}`;
            }
        })
        .join("\n\t");

    submissionCode = submissionCode.replace("{decl_init}", declInit);

    submissionCode = submissionCode.replace("{func_name}", structure.functionName);
    submissionCode = submissionCode.replace("{args}", structure.parameters.map(p => p.name).join(", "));

    if (structure.returnType.category === "base" && structure.returnType.baseType) {
        submissionCode = submissionCode.replace("{print_result}", `print(result, end="")`);
    } else {
        let printResult = "";

        if (structure.returnType.derivedType == "Array") {
            printResult = `
	print(' '.join(map(str, result)))
			`;
        } else {
            printResult = `
	print(result)
			`;
        }

        submissionCode = submissionCode.replace("{print_result}", printResult);
    }

    console.log(submissionCode);

    const base64SubmissionCode = Buffer.from(submissionCode).toString("base64");
    return base64SubmissionCode;
};
