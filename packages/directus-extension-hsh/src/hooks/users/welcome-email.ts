/* eslint-disable turbo/no-undeclared-env-vars */
import { HookConfig } from "@directus/types";
import jwt from "jsonwebtoken";
import { getSimpleHash } from "@directus/utils";
import { generateEmailPayload } from "emails";
import { DirectusServices } from "../../common/directus-services";
import { DirectusStatus } from "types";

const hook: HookConfig = ({ action }, hookContext) => {
  action("junction_directus_users_agencies.items.create", async (params, eventContext) => {
    try {
      const services = DirectusServices.fromHook(hookContext, eventContext);

      const user = await services.usersService.readOne(
        params.payload.directus_users_id.id || params.payload.directus_users_id,
      );
      const agency = await services.agenciesService.readOne(
        params.payload.agencies_id.id || params.payload.agencies_id,
        {
          fields: ["id", "name", "logo.*", "notifications_settings"],
        },
      );

      if (!user || !agency) {
        throw new Error("User or agency not found");
      }

      if (user.status !== DirectusStatus.ACTIVE) return;

      if (!agency.notifications_settings.clinician.welcome_email) {
        hookContext.logger.info(`Welcome email disable by agency ${agency.name}`);
        return;
      }

      const payload = {
        email: user.email,
        scope: "password-reset",
        hash: getSimpleHash("" + user.password),
      };

      const secret = hookContext.env["SECRET"] as string;
      const token = jwt.sign(payload, secret, { expiresIn: "3d", issuer: "directus" });
      const url = process.env.PASSWORD_RESET_URL_ALLOW_LIST;

      const registrationUrl = `${url}?token=${token}`;

      const subject = `Welcome to the ${agency.name} Family!`;

      const email = generateEmailPayload("welcome", user.email, subject, {
        props: {
          previewText: subject,
          user: {
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          },
          agency: {
            name: agency.name,
            logo: agency.logo?.id,
          },
          registrationUrl,
        },
      });

      await services.mailService.send(email);
      hookContext.logger.info(`Welcome email sent to ${user.email} for agency ${agency.name}`);
    } catch (e) {
      hookContext.logger.error(`Error with welcome email. Context: ${JSON.stringify(params, null, 2)}, Error: ${e}`);
    }
  });
};

export default hook;
