import { FunctionStructureType } from "@aayushlad/code-champ-common";
import { baseTypes } from "./baseTypes";
import { derivedTypes } from "./derivedTypes";
import { templates } from "./templates";

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
		.map((param) => {
			const base = baseTypes[param.baseType].c;
			const type = param.derivedType ? derivedTypes[param.derivedType].c.replace("base_type", base) : base;
			return `${type} ${param.name}`;
		})
		.join(", ");
	boilerplate = boilerplate.replace("{params}", params);

	// Attach return type
	const returnBase = baseTypes[structure.returnType.baseType].c;
	const returnType = structure.returnType.derivedType
		? derivedTypes[structure.returnType.derivedType].c.replace("base_type", returnBase)
		: returnBase;
	boilerplate = boilerplate.replace("{return_type}", returnType);

	return boilerplate;
};

const generateCppBoilerplate = (structure: FunctionStructureType): string => {
	let boilerplate = templates.cpp;

	// Attach function name
	boilerplate = boilerplate.replace("{function_name}", structure.functionName);

	// Attach input parameters
	const params = structure.parameters
		.map((param) => {
			const base = baseTypes[param.baseType].cpp;
			const type = param.derivedType ? derivedTypes[param.derivedType].cpp.replace("base_type", base) : base;
			return `${type} ${param.name}`;
		})
		.join(", ");
	boilerplate = boilerplate.replace("{params}", params);

	// Attach return type
	const returnBase = baseTypes[structure.returnType.baseType].cpp;
	const returnType = structure.returnType.derivedType
		? derivedTypes[structure.returnType.derivedType].cpp.replace("base_type", returnBase)
		: returnBase;
	boilerplate = boilerplate.replace("{return_type}", returnType);

	return boilerplate;
};

const generatePython3Boilerplate = (structure: FunctionStructureType): string => {
	let boilerplate = templates.python3;

	// Attach function name
	boilerplate = boilerplate.replace("{function_name}", structure.functionName);

	// Attach input parameters
	const params = structure.parameters
		.map((param) => {
			const base = baseTypes[param.baseType].python3;
			const type = param.derivedType ? derivedTypes[param.derivedType].python3.replace("base_type", base) : base;
			return `${param.name}: ${type}`;
		})
		.join(", ");
	boilerplate = boilerplate.replace("{params}", params);

	// Attach return type
	const returnBase = baseTypes[structure.returnType.baseType].python3;
	const returnType = structure.returnType.derivedType
		? derivedTypes[structure.returnType.derivedType].python3.replace("base_type", returnBase)
		: returnBase;
	boilerplate = boilerplate.replace("{return_type}", returnType);

	return boilerplate;
};

const generateJavaBoilerplate = (structure: FunctionStructureType): string => {
	let boilerplate = templates.java;

	// Attach function name
	boilerplate = boilerplate.replace("{function_name}", structure.functionName);

	// Attach input parameters
	const params = structure.parameters
		.map((param) => {
			const base = baseTypes[param.baseType].java;
			const type = param.derivedType ? derivedTypes[param.derivedType].java.replace("base_type", base) : base;
			return `${type} ${param.name}`;
		})
		.join(", ");
	boilerplate = boilerplate.replace("{params}", params);

	// Attach return type
	const returnBase = baseTypes[structure.returnType.baseType].java;
	const returnType = structure.returnType.derivedType
		? derivedTypes[structure.returnType.derivedType].java.replace("base_type", returnBase)
		: returnBase;
	boilerplate = boilerplate.replace("{return_type}", returnType);

	return boilerplate;
};
