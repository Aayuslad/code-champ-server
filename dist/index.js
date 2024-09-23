var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_express3 = __toESM(require("express"));
var import_config = require("dotenv/config");
var import_cookie_parser = __toESM(require("cookie-parser"));

// src/routes/userRoutes.ts
var import_express = require("express");

// src/controllers/userController.ts
var import_client = require("@prisma/client");

// src/config/mailTransporter.ts
var import_nodemailer = __toESM(require("nodemailer"));
var transporter = import_nodemailer.default.createTransport({
  service: "gmail",
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  from: process.env.SMTP_FROM
});

// src/services/mailService.ts
async function sendOTPMail(to, otp) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL,
      to,
      subject: "OTP Verification",
      html: `
                    <div style="font-family: Helvetica, Arial, sans-serif; min-width: 1000px; overflow:auto; line-height:2">
                    <div style="margin: 50px auto; width: 70%; padding: 20px 0">
                        <div style="border-bottom: 1px solid #eee">
                        <a href="" style="font-size: 1.4em; color: #00466a; text-decoration:none; font-weight:600">Notes</a>
                        </div>
                        <p style="font-size: 1.1em">Hi,</p>
                        <p>Thank you for choosing Your Brand. Use the following OTP to complete your password update procedures. OTP is valid for 5 minutes</p>
                        <h2 style="background: #00466a; margin: 0 auto; width: max-content; padding: 0 10px; color: #fff; border-radius: 4px;">${otp}</h2>
                        <p style="font-size: 0.9em;">Regards,<br />Notes</p>
                        <hr style="border:none; border-top: 1px solid #eee" />
                        <div style="float: right; padding: 8px 0; color: #aaa; font-size: 0.8em; line-height: 1; font-weight: 300">
                        <p>Notes</p>
                        <p>Navsari, Gujarat</p>
                        <p>India</p>
                        </div>
                    </div>
                    </div>
                `
    });
    return true;
  } catch (error) {
    return false;
  }
}

// src/controllers/userController.ts
var import_code_champ_common = require("@aayushlad/code-champ-common");
var import_bcrypt = __toESM(require("bcrypt"));
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var prisma = new import_client.PrismaClient();
var otpLength = 6;
var PEPPER = process.env.BCRYPT_PEPPER;
async function signupUser(req, res) {
  var _a, _b, _c, _d;
  const { email, userName, password } = req.body;
  try {
    if (req.session.signupEmail && !email && !userName && !password) {
      const otp2 = parseInt(
        Math.floor(1e5 + Math.random() * 9e5).toString().slice(0, otpLength)
      );
      req.session.signupOTP = otp2;
      await sendOTPMail(req.session.signupEmail, otp2);
      return res.status(200).json({
        message: "OTP Resent to Email"
      });
    }
    const parsed = import_code_champ_common.signupUserSchema.safeParse({
      email,
      userName,
      password
    });
    if ((_b = (_a = parsed.error) == null ? void 0 : _a.issues[0]) == null ? void 0 : _b.message) {
      return res.status(422).json({ message: (_d = (_c = parsed.error) == null ? void 0 : _c.issues[0]) == null ? void 0 : _d.message });
    }
    if (!parsed.success) return res.status(422).json({ message: "Invalid data" });
    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists) {
      return res.status(400).json({ message: "Email is already in use" });
    }
    const userNameExists = await prisma.user.findUnique({ where: { userName } });
    if (userNameExists) {
      return res.status(400).json({ message: "Username is already in use" });
    }
    const otp = parseInt(
      Math.floor(1e5 + Math.random() * 9e5).toString().slice(0, otpLength)
    );
    req.session.signupOTP = otp;
    req.session.signupEmail = email;
    req.session.userName = userName;
    req.session.password = password;
    await sendOTPMail(email, otp);
    return res.status(200).json({
      message: "OTP Sent to Email"
    });
  } catch {
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}
async function verifySignupOTP(req, res) {
  const { otp } = req.body;
  try {
    const parsed = import_code_champ_common.verifySignupOTPSchema.safeParse({ otp });
    if (!parsed.success) return res.status(422).json({ message: "Invalid OTP" });
    if (parseInt(otp) !== req.session.signupOTP) {
      return res.status(400).json({
        message: "Wrong OTP"
      });
    }
    const passwordWithPepper = req.session.password + PEPPER;
    const hashedPassword = await import_bcrypt.default.hash(passwordWithPepper, 10);
    const user = await prisma.user.create({
      data: {
        email: req.session.signupEmail,
        userName: req.session.userName,
        password: hashedPassword
      }
    });
    const token = import_jsonwebtoken.default.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    req.session.signupOTP = void 0;
    req.session.signupEmail = void 0;
    req.session.userName = void 0;
    req.session.password = void 0;
    return res.json({ message: "Successfully signed up!" });
  } catch {
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}
async function fetchUserProfile(req, res) {
  var _a;
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: (_a = req.user) == null ? void 0 : _a.id
      }
    });
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }
    return res.json({
      id: user.id,
      email: user.email,
      userName: user.userName
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}
async function signinUser(req, res) {
  const { emailOrUsername, password } = req.body;
  try {
    const parsed = import_code_champ_common.signinUserSchema.safeParse({
      emailOrUsername,
      password
    });
    if (!parsed.success) return res.status(422).json({ message: "Invalid data" });
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { userName: emailOrUsername }]
      },
      select: {
        id: true,
        password: true
      }
    });
    if (!user) {
      return res.status(400).json({
        message: "Invalid email or username"
      });
    }
    const passwordWithPepper = password + PEPPER;
    const isPasswordCorrect = await import_bcrypt.default.compare(passwordWithPepper, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: "wrong password"
      });
    }
    const token = import_jsonwebtoken.default.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    return res.json({ message: "Successfully signed in!" });
  } catch {
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}
async function signoutUser(req, res) {
  res.clearCookie("token");
  return res.json({ message: "signed out" });
}
async function sendPasswordResetOTP(req, res) {
  var _a, _b, _c, _d;
  const { email } = req.body;
  try {
    if (req.session.passwordResetEmail && !email) {
      const otp2 = parseInt(
        Math.floor(1e5 + Math.random() * 9e5).toString().slice(0, otpLength)
      );
      req.session.passwordResetOTP = otp2;
      await sendOTPMail(req.session.passwordResetEmail, otp2);
      return res.status(200).json({
        message: "OTP Resent to Email"
      });
    }
    const parsed = import_code_champ_common.sendPasswordResetOTPShema.safeParse({ email });
    if ((_b = (_a = parsed.error) == null ? void 0 : _a.issues[0]) == null ? void 0 : _b.message) {
      return res.status(422).json({ message: (_d = (_c = parsed.error) == null ? void 0 : _c.issues[0]) == null ? void 0 : _d.message });
    }
    if (!parsed.success) return res.status(422).json({ message: "Invalid email" });
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return res.status(400).json({ message: "Account does not exist with this email" });
    const otp = parseInt(
      Math.floor(1e5 + Math.random() * 9e5).toString().slice(0, otpLength)
    );
    req.session.passwordResetOTP = otp;
    req.session.passwordResetEmail = email;
    req.session.canResetPassword = false;
    await sendOTPMail(email, otp);
    return res.status(200).json({
      message: "OTP Sent to Email"
    });
  } catch {
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}
async function verifyPasswordResetOTP(req, res) {
  const { otp } = req.body;
  try {
    const parsed = import_code_champ_common.verifyPasswordResetOTPSchema.safeParse({ otp });
    if (!parsed.success) return res.status(422).json({ message: "Invalid OTP" });
    if (parseInt(otp) !== req.session.passwordResetOTP) {
      return res.status(400).json({
        message: "Wrong OTP"
      });
    }
    req.session.canResetPassword = true;
    return res.json({ message: "OTP verified" });
  } catch {
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}
async function updatePassword(req, res) {
  const { password } = req.body;
  try {
    const parsed = import_code_champ_common.updatePasswordSchema.safeParse({ password });
    if (!parsed.success) return res.status(422).json({ message: "Invalid password" });
    if (!req.session.canResetPassword) {
      return res.status(400).json({
        message: "OTP not verified"
      });
    }
    const passwordWithPepper = password + PEPPER;
    const hashedPassword = await import_bcrypt.default.hash(passwordWithPepper, 10);
    await prisma.user.update({
      where: {
        email: req.session.passwordResetEmail
      },
      data: {
        password: hashedPassword
      }
    });
    req.session.passwordResetOTP = void 0;
    req.session.passwordResetEmail = void 0;
    req.session.canResetPassword = void 0;
    return res.json({ message: "Password updated" });
  } catch {
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}

// src/middlewares/authMiddleware.ts
var import_client2 = require("@prisma/client");
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"));
var prisma2 = new import_client2.PrismaClient();
async function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  try {
    if (!token) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }
    const decodedToken = import_jsonwebtoken2.default.verify(token, process.env.JWT_SECRET);
    if (typeof decodedToken === "string") {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }
    const user = await prisma2.user.findUnique({
      where: {
        id: decodedToken.id
      }
    });
    req.user = user;
    next();
  } catch {
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}

// src/routes/userRoutes.ts
var userRouter = (0, import_express.Router)();
userRouter.post("/signup", signupUser);
userRouter.post("/signup/verify-otp", verifySignupOTP);
userRouter.get("/profile", authMiddleware, fetchUserProfile);
userRouter.post("/signin", signinUser);
userRouter.post("/signout", authMiddleware, signoutUser);
userRouter.post("/password-reset/send-otp", sendPasswordResetOTP);
userRouter.post("/password-reset/verify-otp", verifyPasswordResetOTP);
userRouter.post("/password-reset/update", updatePassword);
var userRoutes_default = userRouter;

// src/routes/problemRouter.ts
var import_express2 = require("express");

// src/controllers/problemController.ts
var import_code_champ_common2 = require("@aayushlad/code-champ-common");
var import_client4 = require("@prisma/client");
var import_axios = __toESM(require("axios"));

// src/config/languageIdmappings.ts
var idToLanguageMappings = {
  1: "python3",
  2: "cpp",
  3: "java",
  4: "c"
};

// src/helper/generateUniqueSlug.ts
var import_client3 = require("@prisma/client");
var prisma3 = new import_client3.PrismaClient();
async function generateUniqueSlug(title) {
  let slug = title.toLowerCase().replace(/\s+/g, "-");
  const existingSlugs = await prisma3.problem.findMany({
    where: {
      slug: {
        startsWith: slug
      }
    },
    select: {
      slug: true
    }
  });
  let uniqueSlug = slug;
  let counter = 1;
  while (existingSlugs.some((problem) => problem.slug === uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  return uniqueSlug;
}

// src/services/awsS3.ts
var import_client_s3 = require("@aws-sdk/client-s3");
var s3 = new import_client_s3.S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
var getObjectFromS3 = async (key) => {
  try {
    const command = new import_client_s3.GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    });
    const response = await s3.send(command);
    const stream = response.Body;
    if (!stream) {
      throw new Error("Response body is undefined");
    }
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks).toString("utf-8");
    return data;
  } catch (err) {
    console.error("Error getting object from S3:", err);
    throw err;
  }
};
var uploadJsonToS3 = async (key, jsonData) => {
  try {
    const command = new import_client_s3.PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(jsonData),
      ContentType: "application/json"
    });
    const response = await s3.send(command);
    return response;
  } catch (err) {
    console.error("Error uploading object to S3:", err);
    throw err;
  }
};

// src/services/boilerplateGenerator/baseTypes.ts
var baseTypes = {
  int: {
    python3: "int",
    java: "int",
    cpp: "int",
    c: "int"
  },
  short: {
    python3: "int",
    java: "short",
    cpp: "short",
    c: "short"
  },
  long: {
    python3: "int",
    java: "long",
    cpp: "long",
    c: "long"
  },
  float: {
    python3: "float",
    java: "float",
    cpp: "float",
    c: "float"
  },
  double: {
    python3: "float",
    java: "double",
    cpp: "double",
    c: "double"
  },
  char: {
    python3: "str",
    java: "char",
    cpp: "char",
    c: "char"
  },
  boolean: {
    python3: "bool",
    java: "boolean",
    cpp: "bool",
    c: "bool"
  }
};

// src/services/boilerplateGenerator/derivedTypes.ts
var derivedTypes = {
  String: {
    python3: "str",
    java: "String",
    cpp: "string",
    c: "char*"
  },
  Array: {
    python3: "List[base_type]",
    java: "base_type[]",
    cpp: "vector<base_type>",
    c: "base_type*"
  },
  LinkedList: {
    python3: "collections.deque[base_type]",
    // python3’s deque can be used as a linked list
    java: "LinkedList<base_type>",
    cpp: "list<base_type>",
    // list in C++ is a doubly-linked list
    c: "struct Node*"
    // Linked list in C is typically implemented using a struct
  },
  Set: {
    python3: "Set[base_type]",
    // python3’s set is unordered
    java: "HashSet<base_type>",
    // HashSet is unordered, TreeSet is ordered
    cpp: "set<base_type>",
    // set is ordered; use unordered_set for unordered
    c: "struct Set*"
    // Custom implementation is typically needed in C
  },
  Map: {
    python3: "Dict[key_type, value_type]",
    // python3’s dict
    java: "HashMap<key_type, value_type>",
    // HashMap is unordered, TreeMap is ordered
    cpp: "unordered_map<key_type, value_type>",
    // unordered_map is common; use map for ordered
    c: "struct Map*"
    // Custom implementation is typically needed in C
  },
  Queue: {
    python3: "collections.deque[base_type]",
    // deque can be used as a queue
    java: "Queue<base_type>",
    // Queue is an interface; often implemented by LinkedList
    cpp: "queue<base_type>",
    // Standard queue in C++
    c: "struct Queue*"
    // Custom implementation is typically needed in C
  },
  Stack: {
    python3: "List[base_type]",
    // python3’s list can be used as a stack (LIFO)
    java: "Stack<base_type>",
    // Stack class is available in Java
    cpp: "stack<base_type>",
    // Standard stack in C++
    c: "struct Stack*"
    // Custom implementation is typically needed in C
  },
  TreeNode: {
    python3: "TreeNode",
    // Typically custom-defined in python3
    java: "TreeNode<base_type>",
    // Custom tree node class in Java
    cpp: "TreeNode<base_type>",
    // Custom tree node class in C++
    c: "struct TreeNode*"
    // Custom struct in C
  },
  GraphNode: {
    python3: "GraphNode",
    // Typically custom-defined in python3
    java: "GraphNode<base_type>",
    // Custom graph node class in Java
    cpp: "GraphNode<base_type>",
    // Custom graph node class in C++
    c: "struct GraphNode*"
    // Custom struct in C
  }
};

// src/services/boilerplateGenerator/templates.ts
var templates = {
  python3: "def {function_name}({params}) -> {return_type}:\n    # Your code here",
  java: "public static {return_type} {function_name}({params}) {\n    // Your code here\n}",
  cpp: "{return_type} {function_name}({params}) {\n    // Your code here\n}",
  c: "{return_type} {function_name}({params}) {\n    // Your code here\n}"
};

// src/services/boilerplateGenerator/boilerplateGenerator.ts
function generateBoilerplate(structure) {
  return {
    c: generateCBoilerplate(structure),
    cpp: generateCppBoilerplate(structure),
    java: generateJavaBoilerplate(structure),
    python3: generatePython3Boilerplate(structure)
  };
}
var generateCBoilerplate = (structure) => {
  let boilerplate = templates.c;
  boilerplate = boilerplate.replace("{function_name}", structure.functionName);
  const params = structure.parameters.map((param) => {
    const base = baseTypes[param.baseType].c;
    const type = param.derivedType ? derivedTypes[param.derivedType].c.replace("base_type", base) : base;
    return `${type} ${param.name}`;
  }).join(", ");
  boilerplate = boilerplate.replace("{params}", params);
  const returnBase = baseTypes[structure.returnType.baseType].c;
  const returnType = structure.returnType.derivedType ? derivedTypes[structure.returnType.derivedType].c.replace("base_type", returnBase) : returnBase;
  boilerplate = boilerplate.replace("{return_type}", returnType);
  return boilerplate;
};
var generateCppBoilerplate = (structure) => {
  let boilerplate = templates.cpp;
  boilerplate = boilerplate.replace("{function_name}", structure.functionName);
  const params = structure.parameters.map((param) => {
    const base = baseTypes[param.baseType].cpp;
    const type = param.derivedType ? derivedTypes[param.derivedType].cpp.replace("base_type", base) : base;
    return `${type} ${param.name}`;
  }).join(", ");
  boilerplate = boilerplate.replace("{params}", params);
  const returnBase = baseTypes[structure.returnType.baseType].cpp;
  const returnType = structure.returnType.derivedType ? derivedTypes[structure.returnType.derivedType].cpp.replace("base_type", returnBase) : returnBase;
  boilerplate = boilerplate.replace("{return_type}", returnType);
  return boilerplate;
};
var generatePython3Boilerplate = (structure) => {
  let boilerplate = templates.python3;
  boilerplate = boilerplate.replace("{function_name}", structure.functionName);
  const params = structure.parameters.map((param) => {
    const base = baseTypes[param.baseType].python3;
    const type = param.derivedType ? derivedTypes[param.derivedType].python3.replace("base_type", base) : base;
    return `${param.name}: ${type}`;
  }).join(", ");
  boilerplate = boilerplate.replace("{params}", params);
  const returnBase = baseTypes[structure.returnType.baseType].python3;
  const returnType = structure.returnType.derivedType ? derivedTypes[structure.returnType.derivedType].python3.replace("base_type", returnBase) : returnBase;
  boilerplate = boilerplate.replace("{return_type}", returnType);
  return boilerplate;
};
var generateJavaBoilerplate = (structure) => {
  let boilerplate = templates.java;
  boilerplate = boilerplate.replace("{function_name}", structure.functionName);
  const params = structure.parameters.map((param) => {
    const base = baseTypes[param.baseType].java;
    const type = param.derivedType ? derivedTypes[param.derivedType].java.replace("base_type", base) : base;
    return `${type} ${param.name}`;
  }).join(", ");
  boilerplate = boilerplate.replace("{params}", params);
  const returnBase = baseTypes[structure.returnType.baseType].java;
  const returnType = structure.returnType.derivedType ? derivedTypes[structure.returnType.derivedType].java.replace("base_type", returnBase) : returnBase;
  boilerplate = boilerplate.replace("{return_type}", returnType);
  return boilerplate;
};

// src/services/boilerplateGenerator/submissionCodeGenerator.ts
function generateSubmissionCode(structure) {
  return {
    c: generateCSubmissionCode(structure),
    cpp: generateCppSubmissionCode(structure),
    java: generateJavaSubmissionCode(structure),
    python3: generatePython3SubmissionCode(structure)
  };
}
var generateCSubmissionCode = (structure) => {
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
  const declInit = structure.parameters.map((p) => {
    const bType = baseTypes[p.baseType].c;
    if (p.category === "derived" && p.derivedType) {
      const dType = derivedTypes[p.derivedType].c;
      const type = dType.replace("{baseType}", bType);
      if (p.derivedType.includes("Array")) {
        const sizeDecl = `int ${p.name}_size;`;
        const sizeInit = `scanf("%d", &${p.name}_size);`;
        const arrDecl = `${type} ${p.name} = malloc(${p.name}_size * sizeof(${bType}));`;
        const arrInit = `for (int i = 0; i < ${p.name}_size; i++) { scanf("%d", &${p.name}[i]); }`;
        return `${sizeDecl}
	${sizeInit}
	${arrDecl}
	${arrInit}`;
      } else {
        return `${type} ${p.name};
scanf("%d", &${p.name});`;
      }
    } else {
      return `${bType} ${p.name};
scanf("%d", &${p.name});`;
    }
  }).join("\n	");
  submissionCode = submissionCode.replace("{decl_init}", declInit);
  const retType = structure.returnType.category === "derived" && structure.returnType.derivedType ? derivedTypes[structure.returnType.derivedType].c.replace("{baseType}", baseTypes[structure.returnType.baseType].c) : baseTypes[structure.returnType.baseType].c;
  submissionCode = submissionCode.replace("{ret_type}", retType);
  submissionCode = submissionCode.replace("{func_name}", structure.functionName);
  submissionCode = submissionCode.replace("{args}", structure.parameters.map((p) => p.name).join(", "));
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
var generateCppSubmissionCode = (structure) => {
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
  const declInit = structure.parameters.map((p) => {
    const bType = baseTypes[p.baseType].cpp;
    if (p.category === "derived" && p.derivedType) {
      const dType = derivedTypes[p.derivedType].cpp;
      const type = dType.replace("{baseType}", bType);
      if (p.derivedType.includes("Array")) {
        const sizeDecl = `int ${p.name}_size;`;
        const sizeInit = `cin >> ${p.name}_size;`;
        const arrDecl = `${type} ${p.name}(${p.name}_size);`;
        const arrInit = `for (int i = 0; i < ${p.name}_size; i++) { cin >> ${p.name}[i]; }`;
        return `${sizeDecl}
	${sizeInit}
	${arrDecl}
	${arrInit}`;
      } else {
        return `${type} ${p.name};
cin >> ${p.name};`;
      }
    } else {
      return `${bType} ${p.name};
cin >> ${p.name};`;
    }
  }).join("\n	");
  submissionCode = submissionCode.replace("{decl_init}", declInit);
  const retType = structure.returnType.category === "derived" && structure.returnType.derivedType ? derivedTypes[structure.returnType.derivedType].cpp.replace(
    "{baseType}",
    baseTypes[structure.returnType.baseType].cpp
  ) : baseTypes[structure.returnType.baseType].cpp;
  submissionCode = submissionCode.replace("{ret_type}", retType);
  submissionCode = submissionCode.replace("{func_name}", structure.functionName);
  submissionCode = submissionCode.replace("{args}", structure.parameters.map((p) => p.name).join(", "));
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
var generatePython3SubmissionCode = (structure) => {
  let submissionCode = `
{solution_code}

if __name__ == "__main__":
	{decl_init}

	result = {func_name}({args})

	{print_result}
`;
  const declInit = structure.parameters.map((p) => {
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
  }).join("\n	");
  submissionCode = submissionCode.replace("{decl_init}", declInit);
  submissionCode = submissionCode.replace("{func_name}", structure.functionName);
  submissionCode = submissionCode.replace("{args}", structure.parameters.map((p) => p.name).join(", "));
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
var generateJavaSubmissionCode = (structure) => {
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
  const declInit = structure.parameters.map((p) => {
    const bType = baseTypes[p.baseType].java;
    if (p.category === "derived" && p.derivedType) {
      const dType = derivedTypes[p.derivedType].java;
      const type = dType.replace("{baseType}", bType);
      if (p.derivedType.includes("Array")) {
        const sizeDecl = `int ${p.name}Size = scanner.nextInt();`;
        const arrDecl = `${type} ${p.name} = new ${bType}[${p.name}Size];`;
        const arrInit = `for (int i = 0; i < ${p.name}Size; i++) { ${p.name}[i] = scanner.next${bType.charAt(0).toUpperCase() + bType.slice(1)}(); }`;
        return `${sizeDecl}
		${arrDecl}
		${arrInit}`;
      } else {
        return `${type} ${p.name} = scanner.next${bType.charAt(0).toUpperCase() + bType.slice(1)}();`;
      }
    } else {
      return `${bType} ${p.name} = scanner.next${bType.charAt(0).toUpperCase() + bType.slice(1)}();`;
    }
  }).join("\n		");
  submissionCode = submissionCode.replace("{decl_init}", declInit);
  const retType = structure.returnType.category === "derived" && structure.returnType.derivedType ? derivedTypes[structure.returnType.derivedType].java.replace(
    "{baseType}",
    baseTypes[structure.returnType.baseType].java
  ) : baseTypes[structure.returnType.baseType].java;
  submissionCode = submissionCode.replace("{ret_type}", retType);
  submissionCode = submissionCode.replace("{func_name}", structure.functionName);
  submissionCode = submissionCode.replace("{args}", structure.parameters.map((p) => p.name).join(", "));
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

// src/services/stdinGenerator.ts
var stdinGenerator = (functionStructure, testCase) => {
  const stdin = functionStructure.parameters.map((parameter, index) => {
    var _a, _b;
    if (parameter.category === "derived" && parameter.derivedType) {
      if (parameter.derivedType === "Array") {
        const stdin2 = (_a = testCase == null ? void 0 : testCase.input[index]) == null ? void 0 : _a.value.split(",").map((item) => item.trim()).join("\n");
        return stdin2;
      }
    } else {
      return `${(_b = testCase == null ? void 0 : testCase.input[index]) == null ? void 0 : _b.value}`;
    }
  }).join("\n");
  const encoded = Buffer.from(stdin).toString("base64");
  return encoded;
};

// src/controllers/problemController.ts
var prisma4 = new import_client4.PrismaClient();
async function contributeProblem(req, res) {
  var _a;
  try {
    const parsed = import_code_champ_common2.contributeProblemSchema.safeParse(req.body);
    console.log(parsed.error);
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
      constraints
    } = parsed.data;
    const slug = await generateUniqueSlug(title);
    await Promise.all([
      uploadJsonToS3(`problem-test-cases/${slug}/sampleTestCases.json`, sampleTestCases),
      uploadJsonToS3(`problem-test-cases/${slug}/testCases.json`, testCases)
    ]);
    const boilerplateCode = generateBoilerplate(functionStructure);
    const submissionCode = generateSubmissionCode(functionStructure);
    const topicTagIdsToAdd = await Promise.all(
      topicTags.filter((tag) => tag.trim()).map(async (tag) => {
        const existingTag = await prisma4.topicTag.findFirst({ where: { content: tag } });
        if (existingTag) {
          return existingTag.id;
        } else {
          const newTag = await prisma4.topicTag.create({ data: { content: tag } });
          return newTag.id;
        }
      })
    );
    const newProblem = await prisma4.problem.create({
      data: {
        title,
        problemNumber: 1,
        slug,
        description,
        difficultyLevel,
        sampleTestCasesKey: `problem-test-cases/${slug}/sampleTestCases.json`,
        testCasesKey: `problem-test-cases/${slug}/testCases.json`,
        boilerplateCode: JSON.stringify(boilerplateCode),
        submissionCode: JSON.stringify(submissionCode),
        testCasesCount: testCases.length || 0,
        functionStructure: JSON.stringify(functionStructure),
        constraints: {
          create: constraints.map((constraint) => ({
            content: constraint
          }))
        },
        topicTags: {
          connect: topicTagIdsToAdd.map((id) => ({ id }))
        },
        hints: {
          create: hints.map((hint) => ({
            content: hint
          }))
        },
        createdBy: {
          connect: {
            id: (_a = req.user) == null ? void 0 : _a.id
          }
        }
      }
    });
    res.status(201).json({
      message: "Problem created successfully",
      problem: newProblem
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}
async function getFeedProblems(req, res) {
  try {
    const problems = await prisma4.problem.findMany({
      take: 50,
      orderBy: {
        problemNumber: "asc"
      },
      select: {
        id: true,
        problemNumber: true,
        title: true,
        difficultyLevel: true,
        submissionCount: true,
        acceptedSubmissions: true
      }
    });
    const editedProblems = problems.map((problem) => {
      const acceptanceRate = problem.submissionCount > 0 ? (problem.acceptedSubmissions / problem.submissionCount * 100).toFixed(2) : "0.00";
      return {
        id: problem.id,
        problemNumber: problem.problemNumber,
        title: problem.title,
        difficulty: problem.difficultyLevel,
        acceptanceRate: `${acceptanceRate}%`
      };
    });
    return res.status(200).json(editedProblems);
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}
async function getProblem(req, res) {
  const { id } = req.params;
  try {
    const problem = await prisma4.problem.findFirst({
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
        createdBy: {
          select: {
            id: true,
            userName: true,
            profileImg: true
          }
        },
        submissionCount: true,
        acceptedSubmissions: true
      }
    });
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }
    const sampleTestCasesJson = await getObjectFromS3(problem.sampleTestCasesKey);
    const parsedTestCases = JSON.parse(sampleTestCasesJson);
    const acceptanceRate = problem.submissionCount > 0 ? (problem.acceptedSubmissions / problem.submissionCount * 100).toFixed(2) : "0.00";
    const { sampleTestCasesKey, ...editedProblem } = {
      ...problem,
      exampleTestCases: parsedTestCases,
      acceptanceRate,
      constraints: problem.constraints.map((constraint) => constraint.content),
      hints: problem.hints.map((hint) => hint.content),
      topicTags: problem.topicTags.map((tag) => tag.content),
      boilerplateCode: JSON.parse(problem.boilerplateCode)
    };
    return res.status(200).json(editedProblem);
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}
async function submitSolution(req, res) {
  var _a;
  try {
    const parsed = import_code_champ_common2.sumitSolutionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ message: "Invalid data" });
    }
    const { problemId, languageId, solutionCode } = parsed.data;
    const problem = await prisma4.problem.findFirst({
      where: { id: problemId },
      select: {
        id: true,
        testCasesKey: true,
        functionStructure: true,
        submissionCode: true
      }
    });
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }
    const testCases = JSON.parse(await getObjectFromS3(problem.testCasesKey));
    const functionStructure = JSON.parse(problem.functionStructure);
    const parsedSubmissionCode = JSON.parse(problem.submissionCode);
    const languageKey = idToLanguageMappings[languageId];
    const solutionTemplate = parsedSubmissionCode[languageKey];
    const finalCode = solutionTemplate.replace("{solution_code}", solutionCode);
    const encodedFinalCode = Buffer.from(finalCode).toString("base64");
    const submission = await prisma4.submission.create({
      data: {
        problemId,
        code: solutionCode,
        languageId: languageId.toString(),
        status: "Pending",
        createdById: ((_a = req.user) == null ? void 0 : _a.id) ?? ""
      }
    });
    const response = await import_axios.default.post("https://codesandbox.code-champ.xyz/submit-batch-task", {
      submissionId: submission.id,
      callbackUrl: "https://code-champ-webhook-handler.vercel.app/submit-task-callback",
      languageId,
      code: encodedFinalCode,
      tasks: testCases.map((testCase, index) => ({
        id: index,
        stdin: stdinGenerator(functionStructure, testCase),
        expectedOutput: testCase.output,
        inputs: JSON.stringify(testCase.input)
      }))
    });
    return res.status(200).json({
      message: "Solution submitted successfully",
      taskId: response.data.batchTaskId
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
}
async function checkBatchSubmission(req, res) {
  var _a;
  try {
    const { taskId, problemId } = req.params;
    const result = await import_axios.default.get(`https://codesandbox.code-champ.xyz/batch-task-status/${taskId}`);
    const editedResult = {
      ...result.data,
      problemId,
      tasks: ((_a = result.data.tasks) == null ? void 0 : _a.map((task) => ({
        ...task,
        expectedOutput: JSON.parse(task.expectedOutput),
        inputs: JSON.parse(task.inputs)
      }))) || []
    };
    return res.json(editedResult);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}
async function getSubmissions(req, res) {
  var _a;
  try {
    const { problemId } = req.params;
    const submission = await prisma4.submission.findMany({
      where: {
        createdById: ((_a = req.user) == null ? void 0 : _a.id) || "",
        problemId
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        code: true,
        languageId: true,
        status: true,
        createdAt: true
      }
    });
    return res.status(200).json(submission);
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}

// src/routes/problemRouter.ts
var problemRouter = (0, import_express2.Router)();
problemRouter.get("/bulk", getFeedProblems);
problemRouter.post("/contribute", authMiddleware, contributeProblem);
problemRouter.post("/submit", authMiddleware, submitSolution);
problemRouter.get("/submission/:problemId", authMiddleware, getSubmissions);
problemRouter.get("/check/:taskId/:problemId", authMiddleware, checkBatchSubmission);
problemRouter.get("/:id", getProblem);
var problemRouter_default = problemRouter;

// src/index.ts
var import_cors = __toESM(require("cors"));
var import_express_session = __toESM(require("express-session"));
var import_morgan = __toESM(require("morgan"));
var app = (0, import_express3.default)();
var PORT = process.env.PORT || 8080;
app.set("trust proxy", 1);
app.use(
  (0, import_cors.default)({
    origin: ["https://app.code-champ.xyz", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  })
);
app.use(import_express3.default.json());
app.use((0, import_cookie_parser.default)());
app.disable("x-powerd-by");
app.use(import_express3.default.urlencoded({ extended: true }));
app.use((0, import_morgan.default)("tiny"));
app.use(
  (0, import_express_session.default)({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 5 * 60 * 1e3,
      // 5 minutes
      secure: true,
      httpOnly: true,
      sameSite: "none"
    }
  })
);
app.get("/", (req, res) => {
  res.send("Welcome, This is code champ server \u{1F525}.");
});
app.use("/user", userRoutes_default);
app.use("/problem", problemRouter_default);
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
