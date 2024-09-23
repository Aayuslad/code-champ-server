import { FunctionStructureType } from "@aayushlad/code-champ-common";
import { baseTypes } from "./baseTypes";
import { derivedTypes } from "./derivedTypes";

export function generateSubmissionCode(structure: FunctionStructureType) {
    return {
        c: generateCSubmissionCode(structure),
        cpp: generateCppSubmissionCode(structure),
        java: generateJavaSubmissionCode(structure),
        python3: generatePython3SubmissionCode(structure),
    };
}

const generateCSubmissionCode = (structure: FunctionStructureType) => {
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

    // adding variable declaration and initialization for function parameters
    const declInit = structure.parameters
        .map(p => {
            const bType = baseTypes[p.baseType].c;
            if (p.category === "derived" && p.derivedType) {
                const dType = derivedTypes[p.derivedType].c;
                const type = dType.replace("{baseType}", bType);

                if (p.derivedType.includes("Array")) {
                    const sizeDecl = `int ${p.name}_size;`;
                    const sizeInit = `scanf("%d", &${p.name}_size);`;
                    const arrDecl = `${type} ${p.name} = malloc(${p.name}_size * sizeof(${bType}));`;
                    const arrInit = `for (int i = 0; i < ${p.name}_size; i++) { scanf("%d", &${p.name}[i]); }`;

                    return `${sizeDecl}\n\t${sizeInit}\n\t${arrDecl}\n\t${arrInit}`;
                } else {
                    return `${type} ${p.name};\nscanf("%d", &${p.name});`;
                }
            } else {
                return `${bType} ${p.name};\nscanf("%d", &${p.name});`;
            }
        })
        .join("\n\t");

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

    return submissionCode;
};

const generateCppSubmissionCode = (structure: FunctionStructureType) => {
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

    // adding varible declaration and initialization for function parameters
    const declInit = structure.parameters
        .map(p => {
            const bType = baseTypes[p.baseType].cpp;
            if (p.category === "derived" && p.derivedType) {
                const dType = derivedTypes[p.derivedType].cpp;
                const type = dType.replace("{baseType}", bType);

                if (p.derivedType.includes("Array")) {
                    const sizeDecl = `int ${p.name}_size;`;
                    const sizeInit = `cin >> ${p.name}_size;`;
                    const arrDecl = `${type} ${p.name}(${p.name}_size);`;
                    const arrInit = `for (int i = 0; i < ${p.name}_size; i++) { cin >> ${p.name}[i]; }`;

                    return `${sizeDecl}\n\t${sizeInit}\n\t${arrDecl}\n\t${arrInit}`;
                } else {
                    return `${type} ${p.name};\ncin >> ${p.name};`;
                }
            } else {
                return `${bType} ${p.name};\ncin >> ${p.name};`;
            }
        })
        .join("\n\t");

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

    return submissionCode;
};

const generatePython3SubmissionCode = (structure: FunctionStructureType) => {
    let submissionCode = `
{solution_code}

if __name__ == "__main__":
	{decl_init}

	result = {func_name}({args})

	{print_result}
`;

    // adding variable declaration and initialization for function parameters
    const declInit = structure.parameters
        .map(p => {
            const bType = baseTypes[p.baseType].python3;
            if (p.category === "derived" && p.derivedType) {
                const dType = derivedTypes[p.derivedType].python3;
                const type = dType.replace("{baseType}", bType);

                if (p.derivedType.includes("Array")) {
                    return `${p.name} = list(map(${bType}, input().split()))`;
                } else {
                    return `${p.name} = ${type}(input())`;
                }
            } else {
                return `${p.name} = ${bType}(input())`;
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

    return submissionCode;
};

const generateJavaSubmissionCode = (structure: FunctionStructureType) => {
    let submissionCode = `
import java.util.*;
import java.io.*;

public class Solution {
	{solution_code}

	public static void main(String[] args) {
		Scanner scanner = new Scanner(System.in);
		{decl_init}

		{ret_type} result = {func_name}({args});

		{print_result}

		scanner.close();
	}
}`;

    // adding variable declaration and initialization for function parameters
    const declInit = structure.parameters
        .map(p => {
            const bType = baseTypes[p.baseType].java;
            if (p.category === "derived" && p.derivedType) {
                const dType = derivedTypes[p.derivedType].java;
                const type = dType.replace("{baseType}", bType);

                if (p.derivedType.includes("Array")) {
                    const sizeDecl = `int ${p.name}Size = scanner.nextInt();`;
                    const arrDecl = `${type} ${p.name} = new ${bType}[${p.name}Size];`;
                    const arrInit = `for (int i = 0; i < ${p.name}Size; i++) { ${p.name}[i] = scanner.next${bType.charAt(0).toUpperCase() + bType.slice(1)}(); }`;
                    return `${sizeDecl}\n\t\t${arrDecl}\n\t\t${arrInit}`;
                } else {
                    return `${type} ${p.name} = scanner.next${bType.charAt(0).toUpperCase() + bType.slice(1)}();`;
                }
            } else {
                return `${bType} ${p.name} = scanner.next${bType.charAt(0).toUpperCase() + bType.slice(1)}();`;
            }
        })
        .join("\n\t\t");

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

    return submissionCode;
};
