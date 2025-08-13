// making custom express request to add user object in request
declare namespace Express {
	export interface Request {
		user: {
			id: string;
			name: string;
			userName: string;
			email: string;
			password: string;
			profileImg: string | null;
		} | null;
		admin?: {
			isAdmin: boolean;
		};
	}
}
