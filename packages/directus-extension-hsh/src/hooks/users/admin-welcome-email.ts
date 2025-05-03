/* eslint-disable turbo/no-undeclared-env-vars */
import { defineHook } from "@directus/extensions-sdk";
import { generateEmailPayload } from "emails";
import { getSimpleHash } from "@directus/utils";
import jwt from "jsonwebtoken";
import { DirectusServices } from "../../common/directus-services";

export default defineHook(async ({ action }, hookContext) => {
  const collection = "users";

  action(`${collection}.create`, async (params, eventContext) => {
    const services = DirectusServices.fromHook(hookContext, eventContext);

    const userId = params.key;
    const adminRoleId = "cc987fae-dbb9-4d72-8199-21243fa13c92";

    const user = await services.usersService.readOne(userId, {
      fields: ["*", "password"],
    });

    if (user.role !== adminRoleId) return;

    const payload = {
      email: user.email,
      scope: "password-reset",
      hash: getSimpleHash("" + user.password),
    };

    const secret = hookContext.env.SECRET;
    const token = jwt.sign(payload, secret, { expiresIn: "3d", issuer: "directus" });
    const url = process.env.PASSWORD_RESET_URL_ALLOW_LIST;

    const registrationUrl = `${url}?token=${token}`;

    const email = generateEmailPayload("admin-welcome", user.email, `Welcome to the HSH Family!`, {
      props: {
        previewText: `Welcome to the HSH Family!`,
        user,
        registrationUrl,
      },
    });

    await services.mailService.send(email);

    hookContext.logger.info(`Welcome notification for admin [${user.email}] sent`);
  });
});
