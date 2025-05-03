import { defineHook } from "@directus/extensions-sdk";

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload, Options } from "@aws-sdk/lib-storage";
import unzipper from "unzipper";
import mime from "mime-types";

import { Crypto } from "@peculiar/webcrypto";
import { Readable } from "stream";

export default defineHook(async ({ action }, { env }) => {
  global.crypto = new Crypto();

  const credentials =
    env.STORAGE_LOCAL_KEY && env.STORAGE_LOCAL_SECRET
      ? {
          secretAccessKey: env.STORAGE_LOCAL_SECRET,
          accessKeyId: env.STORAGE_LOCAL_KEY,
        }
      : undefined;

  const s3Client = new S3Client({
    region: env["STORAGE_LOCAL_REGION"],
    credentials,
  });

  action("modules_versions.items.create", async (params) => {
    const packageItem = params.payload.package;
    const versionPackageId = packageItem.id;

    if (versionPackageId) {
      try {
        const params = {
          Bucket: env["STORAGE_LOCAL_BUCKET"],
          Key: packageItem.filename_download,
        };

        const data = await s3Client.send(new GetObjectCommand(params));

        await new Promise<void>((resolve, reject) => {
          const s3Stream = Readable.from(data.Body as any);

          s3Stream
            .pipe(unzipper.Parse())
            .on("entry", async (entry) => {
              const unzippedKey = `packages/${versionPackageId}/${entry.path}`;
              const type = mime.lookup(entry.path) || "application/octet-stream";

              const uploadParams: Options["params"] = {
                Bucket: env["STORAGE_PACKAGES_BUCKET"]!,
                Key: unzippedKey,
                Body: entry,
                ContentType: type,
              };

              const uploadFile = new Upload({
                client: s3Client,
                params: uploadParams,
              });

              await uploadFile.done();
            })
            .on("close", () => {
              resolve();
            })
            .on("error", (error) => {
              reject(new Error(`Error on unzip file: ${error}`));
            });
        });

        console.log(`Package ${versionPackageId} uploaded to S3`);
      } catch (error) {
        console.log(error);
        throw new Error(`Error on upload package ${versionPackageId} to S3`);
      }
    }
  });
});
