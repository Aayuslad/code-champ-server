import "express-session";

declare module "express-session" {
	interface SessionData {
		signupOTP: number;
		signupEmail: string;
		userName: string;
		password: string;
		passwordResetOTP: number;
		passwordResetEmail: string;
		canResetPassword: boolean;
	}
}
