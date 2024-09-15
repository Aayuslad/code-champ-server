import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
	region: process.env.AWS_REGION as string,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
	},
});

// Function to get the object from S3 and process it
export const getObjectFromS3 = async (key: string) => {
	try {
		const command = new GetObjectCommand({
			Bucket: process.env.S3_BUCKET_NAME,
			Key: key,
		});

		const response = await s3.send(command);

		// Process the object (e.g., convert to string, parse, etc.)
		const stream = response.Body;
		if (!stream) {
			throw new Error("Response body is undefined");
		}
		const chunks = [];
		for await (const chunk of stream as AsyncIterable<Uint8Array>) {
			chunks.push(chunk);
		}
		const data = Buffer.concat(chunks).toString("utf-8");

		return data;
	} catch (err) {
		console.error("Error getting object from S3:", err);
		throw err;
	}
};

// Function to upload JSON file to S3
export const uploadJsonToS3 = async (key: string, jsonData: object) => {
	try {
		const command = new PutObjectCommand({
			Bucket: process.env.S3_BUCKET_NAME,
			Key: key,
			Body: JSON.stringify(jsonData),
			ContentType: "application/json",
		});

		const response = await s3.send(command);
		return response;
	} catch (err) {
		console.error("Error uploading object to S3:", err);
		throw err;
	}
};
