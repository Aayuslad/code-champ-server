import { TestCaseType, FunctionStructureType } from "@aayushlad/code-champ-common";

export const stdinGenerator = (functionStructure: FunctionStructureType, testCase: TestCaseType) => {
    const stdin: string = functionStructure.parameters
        .map((parameter, index) => {
            if (parameter.category === "derived" && parameter.derivedType) {
                if (parameter.derivedType === "Array") {
                    const stdin = testCase?.input[index]?.value;
                    if (stdin) {
                        const values = stdin.split(",").map(item => item.trim());
                        const arraySize = values.length;
                        return `${arraySize}\n${values.join("\n")}\n`;
                    }
                    return "";
                }
            } else {
                return `${testCase?.input[index]?.value}`;
            }
        })
        .join("\n");

    const encoded = Buffer.from(stdin).toString("base64");
    return encoded;
};
