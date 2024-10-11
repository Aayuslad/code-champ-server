import { PrismaClient } from "@prisma/client";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const prisma = new PrismaClient();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            callbackURL: "/user/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user already exists
                let user = await prisma.user.findUnique({
                    where: { googleId: profile.id },
                });

                if (!user) {
                    // If no user with googleId, check by email
                    const existingUserByEmail = await prisma.user.findUnique({
                        where: { email: profile.emails?.[0]?.value },
                    });

                    if (existingUserByEmail) {
                        // If user exists but no googleId, associate Google account
                        user = await prisma.user.update({
                            where: { email: profile.emails?.[0]?.value },
                            data: {
                                googleId: profile.id,
                                avatar: profile.photos?.[0]?.value || null,
                            },
                        });
                    } else {
                        // Create new user if no existing one
                        user = await prisma.user.create({
                            data: {
                                googleId: profile.id,
                                email: profile.emails?.[0]?.value || "",
                                userName: profile.displayName,
                                avatar: profile.photos?.[0]?.value || null,
                            },
                        });
                    }
                }

                done(null, user); // This will pass the user to serializeUser
            } catch (err) {
                done(err, undefined);
            }
        },
    ),
);

GoogleStrategy.prototype.authorizationParams = function () {
    return { prompt: "select_account" }; // Forces account selection
};

passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

export default passport;
