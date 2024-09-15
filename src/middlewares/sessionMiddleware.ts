import session from "express-session";
import { Request, Response, NextFunction } from "express";

const sessionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
	session({
		secret: process.env.SESSION_SECRET as string,
		resave: false,
		saveUninitialized: true,
		cookie: {
			maxAge: 5 * 60 * 1000, // 5 minutes
			secure: process.env.NODE_ENV === "production",
			httpOnly: true,
			sameSite: "none",
		},
	})(req, res, next);
};

export default sessionMiddleware;

// TODO : this exported session middleware is not working, most probably because of the session store is in memory so it creates new session everytime. can be solved if we add sql store.

// TODO : add postgress store for session

/*
1. Install connect-pg-simple
First, install the necessary packages:

bash
Copy code
npm install connect-pg-simple express-session pg
2. Update Your Session Middleware
Now, you can update your sessionMiddleware to use PostgreSQL as the session store.

Here's how you can do it:

typescript
Copy code
import session from "express-session";
import pgSession from "connect-pg-simple";
import { Pool } from "pg";
import { Request, Response, NextFunction } from "express";

// Create a new PostgreSQL pool
const pool = new Pool({
    connectionString: process.env.DB_URL, // Your PostgreSQL connection string
});

export function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
    session({
        store: new (pgSession(session))({
            pool: pool, // Use the PostgreSQL pool
            tableName: 'session', // Optional: defaults to 'session'
            pruneSessionInterval: 60 // Time in seconds to prune expired sessions (default is 60 seconds)
        }),
        secret: process.env.SESSION_SECRET as string,
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 5 * 60 * 1000, // 5 minutes
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: "none",
        },
    })(req, res, next);
}
3. Create the Session Table in PostgreSQL
The connect-pg-simple package will automatically create a session table if it doesn't already exist. However, you can manually create it by running the following SQL command:

sql
Copy code
CREATE TABLE session (
    sid TEXT PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMPTZ NOT NULL
);
4. Explanation
pgSession(session): This initializes the connect-pg-simple session store with your PostgreSQL configuration.
pruneSessionInterval: This option defines how often (in seconds) expired sessions will be removed from the database. By default, this is set to 60 seconds.
maxAge: The cookie's maxAge is set to 5 minutes, so the session will expire 5 minutes after it's created.
5. Run Your App
With this setup, session data will be stored in PostgreSQL, and expired sessions will be automatically pruned according to the pruneSessionInterval setting.

This approach ensures that sessions are properly managed, with automatic cleanup of expired sessions in your PostgreSQL database.
*/
