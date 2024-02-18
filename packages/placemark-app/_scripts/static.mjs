import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs";
import fg from "fast-glob";
import mime from "mime";

const client = new S3Client({
  region: "us-east-1",
  endpoint:
    "https://7262a5dd5cc8fe9c09033119a754badd.r2.cloudflarestorage.com/",
});

const base = `./.next/static/`;

await Promise.all(
  fg.sync([`${base}**`]).map(async (file) => {
    const Key = file.replace(base, "_next/static/");
    let ContentType = mime.getType(file);

    if (ContentType === "application/javascript") {
      ContentType += ";charset=UTF-8";
    }

    await client.send(
      new PutObjectCommand({
        Key,
        ContentType,
        Bucket:
          process.env.NODE_ENV === "production"
            ? "placemark-app-build"
            : "app-build-dev",
        Body: fs.readFileSync(file),
      })
    );

    console.log(`PUT ${Key}\t(${ContentType})`);
  })
);
