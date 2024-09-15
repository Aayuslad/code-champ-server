import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
	service: "gmail",
	host: process.env.SMTP_HOST,
	port: parseInt(process.env.SMTP_PORT as string),
	secure: true,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
	from: process.env.SMTP_FROM,
});
