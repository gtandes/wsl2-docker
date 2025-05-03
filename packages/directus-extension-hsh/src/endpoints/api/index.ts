import { defineEndpoint } from "@directus/extensions-sdk";
import jwt from "jsonwebtoken";
import { DirectusServices } from "../../common/directus-services";
import { createRandomString } from "./utils";

export default defineEndpoint((router, endpointContext) => {
  router.get("/generate/token/:agency", async (req: any, res: any) => {
    try {
      const services = DirectusServices.fromEndpoint(endpointContext, req);
      const secret = createRandomString(40);
      const agency_id = req.params.agency;
      const agency = await services.agenciesService.readOne(agency_id, { fields: ["id", "name"] });
      const token = jwt.sign(
        {
          id: agency.id,
          name: agency.name,
        },
        secret,
        { issuer: "directus" },
      );

      return res.send(200, { token, secret });
    } catch (e) {
      endpointContext.logger.error("Token generation failed");
      return res.sendStatus(400);
    }
  });
});
