import { transporter } from "../config/mailTransporter";

export async function sendOTPMail(to: string, otp: number): Promise<boolean> {
	try {
		await transporter.sendMail({
            from: process.env.EMAIL,
            to: to,
            subject: "OTP Verification",
            html: `
                <div style="font-family: Helvetica, Arial, sans-serif; min-width: 1000px; overflow:auto; line-height:2">
                    <div style="margin: 50px auto; width: 70%; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <div style="border-bottom: 1px solid #eee; padding-bottom: 20px;">
                            <h1 style="font-size: 2em; color: #003366; font-weight: 600; margin-bottom: 10px;">Code Champ</h1>
                            <p style="color: #555; font-size: 1.2em;">Unleash Your Coding Potential</p>
                        </div>
                        <p style="font-size: 1.2em; color: #333;">Hi,</p>
                        <p style="font-size: 1.1em; color: #333;">
                            You're just one step away from getting started with Code Champ! Use the OTP below to verify your email address and secure your account. This OTP is valid for 5 minutes, so be sure to enter it soon.
                        </p>
                        <div style="text-align: center; margin: 20px 0;">
                            <div style="display: inline-block; background: #003366; color: white; font-size: 1.6em; padding: 5px 15px; border-radius: 8px; letter-spacing: 2px;">${otp}</div>
                        </div>
                        <p style="font-size: 1.1em; color: #333;">
                            At Code Champ, we're dedicated to helping you enhance your problem-solving skills and succeed in your coding journey. Whether you're practicing for interviews or challenging yourself with complex algorithms, we're here to support you every step of the way.
                        </p>
                        <p style="font-size: 1.1em; color: #333;">
                            If you didn’t request this OTP, please contact us immediately or ignore this email.
                        </p>
                        <p style="font-size: 0.9em; color: #666;">Best regards,<br />The Code Champ Team</p>
                        <hr style="border:none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <div style="padding: 8px 0; color: #aaa; font-size: 0.8em; line-height: 1.5; font-weight: 300">
                            <p>Code Champ</p>
                            <p>Navsari, Gujarat</p>
                            <p>India</p>
                        </div>
                    </div>
                </div>
            `,
        });

		return true;
	} catch (error) {
		return false;
	}
}
