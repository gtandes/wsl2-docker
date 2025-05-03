import { defineEndpoint } from "@directus/extensions-sdk";
import helmet from "helmet";
import S3Proxy from "s3proxy";

export default defineEndpoint((router, { env }) => {
  const credentials =
    env.STORAGE_LOCAL_KEY && env.STORAGE_LOCAL_SECRET
      ? {
          secretAccessKey: env.STORAGE_LOCAL_SECRET,
          accessKeyId: env.STORAGE_LOCAL_KEY,
        }
      : undefined;

  const proxy = new S3Proxy({
    bucket: env["STORAGE_PACKAGES_BUCKET"]!,
    region: env["STORAGE_LOCAL_REGION"],
    credentials,
  });

  proxy.init();

  const cspConfig = {
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", "*"], // Add your allowed iframe sources here
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts
      mediaSrc: ["'self'", "data:"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "*"],
    },
  };

  router.use(helmet.contentSecurityPolicy(cspConfig));

  router
    .route("/packages/*")
    .head(async (_req, res) => {
      await proxy.head(_req, res);
      res.end();
    })
    .get(async (_req, res) => {
      (await proxy.get(_req, res)).on("error", () => res.end()).pipe(res);
    });
});
