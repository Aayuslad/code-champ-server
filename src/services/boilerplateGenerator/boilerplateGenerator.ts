import { FunctionStructureType } from "@aayushlad/code-champ-common";
import { baseTypes } from "./baseTypes";
import { derivedTypes } from "./derivedTypes";
import { templates } from "./templates";
import { typeModifiers } from "./typeModifires";

export function generateBoilerplate(structure: FunctionStructureType) {
    return {
        c: generateCBoilerplate(structure),
        cpp: generateCppBoilerplate(structure),
        java: generateJavaBoilerplate(structure),
        python3: generatePython3Boilerplate(structure),
    };
}

const generateCBoilerplate = (structure: FunctionStructureType): string => {
    let boilerplate = templates.c;

    // Attach function name
    boilerplate = boilerplate.replace("{function_name}", structure.functionName);

    // Attach input parameters
    const params = structure.parameters
        .map(param => {
            const base = baseTypes[param.baseType].c;
            let type = param.derivedType ? derivedTypes[param.derivedType].c.replace("base_type", base) : base;
            if (param.typeModifier) {
                type = `${typeModifiers[param.typeModifier].cpp} ${type}`;
            }
            if (param.derivedType === "Array") {
                return [`${type} ${param.name}`, `int ${param.name}_size`];
            }
            return `${type} ${param.name}`;
        })
        .flat()
        .join(", ");
    boilerplate = boilerplate.replace("{params}", params);

    // Attach return type
    const returnBase = baseTypes[structure.returnType.baseType].c;
    const returnType = structure.returnType.derivedType
        ? derivedTypes[structure.returnType.derivedType].c.replace("base_type", returnBase)
        : returnBase;
    const finalReturnType = structure.returnType.typeModifier
        ? `${typeModifiers[structure.returnType.typeModifier].c} ${returnType}`
        : returnType;
    boilerplate = boilerplate.replace("{return_type}", finalReturnType);

    return boilerplate;
};

const generateCppBoilerplate = (structure: FunctionStructureType): string => {
    let boilerplate = templates.cpp;

    // Attach function name
    boilerplate = boilerplate.replace("{function_name}", structure.functionName);

    // Attach input parameters
    const params = structure.parameters
        .map(param => {
            const base = baseTypes[param.baseType].cpp;
            let type = param.derivedType ? derivedTypes[param.derivedType].cpp.replace("base_type", base) : base;
            if (param.typeModifier) {
                type = `${typeModifiers[param.typeModifier].cpp} ${type}`;
            }
            return `${type} ${param.name}`;
        })
        .join(", ");
    boilerplate = boilerplate.replace("{params}", params);

    // Attach return type
    const returnBase = baseTypes[structure.returnType.baseType].cpp;
    const returnType = structure.returnType.derivedType
        ? derivedTypes[structure.returnType.derivedType].cpp.replace("base_type", returnBase)
        : returnBase;
    const finalReturnType = structure.returnType.typeModifier
        ? `${typeModifiers[structure.returnType.typeModifier].cpp} ${returnType}`
        : returnType;
    boilerplate = boilerplate.replace("{return_type}", finalReturnType);

    return boilerplate;
};

const generatePython3Boilerplate = (structure: FunctionStructureType): string => {
    let boilerplate = templates.python3;

    // Attach function name
    boilerplate = boilerplate.replace("{function_name}", structure.functionName);

    // Attach input parameters
    const params = structure.parameters
        .map(param => {
            const base = baseTypes[param.baseType].python3;
            let type = param.derivedType ? derivedTypes[param.derivedType].python3.replace("base_type", base) : base;
            if (param.typeModifier) {
                type = `${typeModifiers[param.typeModifier].python3} ${type}`;
            }
            return `${param.name}: ${type}`;
        })
        .join(", ");
    boilerplate = boilerplate.replace("{params}", params);

    // Attach return type
    const returnBase = baseTypes[structure.returnType.baseType].python3;
    const returnType = structure.returnType.derivedType
        ? derivedTypes[structure.returnType.derivedType].python3.replace("base_type", returnBase)
        : returnBase;
    const finalReturnType = structure.returnType.typeModifier
        ? `${typeModifiers[structure.returnType.typeModifier].python3} ${returnType}`
        : returnType;
    boilerplate = boilerplate.replace("{return_type}", finalReturnType);

    return boilerplate;
};

const generateJavaBoilerplate = (structure: FunctionStructureType): string => {
    let boilerplate = templates.java;

    // Attach function name
    boilerplate = boilerplate.replace("{function_name}", structure.functionName);

    // Attach input parameters
    const params = structure.parameters
        .map(param => {
            const base = baseTypes[param.baseType].java;
            let type = param.derivedType ? derivedTypes[param.derivedType].java.replace("base_type", base) : base;
            if (param.typeModifier) {
                const typeModifier = typeModifiers[param.typeModifier].java;
                returnType = ["short", "BigInteger", "long"].includes(typeModifier)
                    ? typeModifier
                    : `${typeModifier} ${returnType}`;
            }
            return `${type} ${param.name}`;
        })
        .join(", ");
    boilerplate = boilerplate.replace("{params}", params);

    // Attach return type
    const returnBase = baseTypes[structure.returnType.baseType].java;
    let returnType = structure.returnType.derivedType
        ? derivedTypes[structure.returnType.derivedType].java.replace("base_type", returnBase)
        : returnBase;
    if (structure.returnType.typeModifier) {
        const typeModifier = typeModifiers[structure.returnType.typeModifier].java;
        returnType = ["short", "BigInteger", "long"].includes(typeModifier) ? typeModifier : `${typeModifier} ${returnType}`;
    }
    boilerplate = boilerplate.replace("{return_type}", returnType);

    return boilerplate;
};
