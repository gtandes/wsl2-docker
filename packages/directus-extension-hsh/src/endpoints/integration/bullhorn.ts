import { defineEndpoint } from "@directus/extensions-sdk";

import { BullhornOAuthApi } from "./services/bullhornApi";
import { v4 as uuidv4 } from "uuid";
import { UserRole } from "types";
import { DBService } from "../../common/services";
import { DirectusServices } from "../../common/directus-services";
import { computeStatusSummary, validateCredentials } from "./utils";
import fs from "fs";
import path from "path";
import pLimit from "p-limit";

const MAX_CONCURRENT_REQUESTS = 10;

const limit = pLimit(MAX_CONCURRENT_REQUESTS);

const getCustomText4OptionsId = async (restUrl: string, bhRestToken: string) => {
  const response = await fetch(`${restUrl}/meta/Candidate?fields=customText4`, {
    method: "GET",
    headers: {
      BhRestToken: bhRestToken,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  const options = data.fields[0].options;
  if (!options) throw new Error("customText4 is not linked to a corporate dictionary");

  return options;
};

const BASE_UPLOAD_DIR = path.join(__dirname, "users");

async function getBullhornConfig(db: any, agency_id: string) {
  const bhDB = db.get("bh_config");
  const [config] = await bhDB.readByQuery({ filter: { agency_id: { _eq: agency_id } }, limit: 1 });

  if (!config) throw { status: 404, message: "Bullhorn configuration not found" };

  const bullhornApi = new BullhornOAuthApi({
    client_id: config.client_id,
    client_secret: config.client_secret,
    client_username: config.client_username,
    client_password: config.client_password,
  });

  const authData = await bullhornApi.login();
  if (!authData) throw { status: 401, message: "Invalid Bullhorn credentials" };

  const updatedTokens = {
    bh_access_token: authData.access_token,
    bh_refresh_token: authData.refresh_token,
    bh_session_key: authData.BhRestToken,
  };

  await bhDB.updateOne(config.id, updatedTokens);
  return { config, authData };
}

const fetchWithRetry = async (url: string, options: any, retries = 3, delay = 1000): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { ...options, timeout: 5000 });

      // Handle rate limit
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const delayTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay * (i + 1);
        console.log(`Rate limit exceeded. Retrying after ${delayTime}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayTime));
        continue;
      }

      // Handle 500 errors by retrying
      if (res.status === 500) {
        const delayTime = delay * (i + 1);
        console.log(`Server error (500). Retrying after ${delayTime}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayTime));
        continue;
      }

      if (res.ok) {
        return res;
      } else {
        const responseBody = await res.text();
        console.log(`Fetch failed with status: ${res.status} - Response: ${responseBody}`);
      }
    } catch (error: any) {
      console.log(`Fetch error (attempt ${i + 1} of ${retries}): ${error.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
  }

  throw new Error(`Failed after ${retries} retries: ${url}`);
};

const fetchAllCandidates = async (restUrl: string, BhRestToken: string): Promise<any[]> => {
  const count = 1000;

  try {
    const firstPageRes = await fetchWithRetry(
      `${restUrl}/search/Candidate?query=isDeleted:0 AND NOT status:Archive&fields=id,email&sort=dateAdded&count=${count}&start=0`,
      { headers: { BhRestToken } },
    );

    const firstPageData = await firstPageRes.json();
    const total = firstPageData.total;
    const pages = Math.ceil(total / count);

    const fetchPage = (start: number) => async () => {
      const res = await fetchWithRetry(
        `${restUrl}/search/Candidate?query=isDeleted:0 AND NOT status:Archive&fields=id,firstName,lastName,email,dateAdded&sort=dateAdded&count=${count}&start=${start}`,
        { headers: { BhRestToken } },
      );
      const data = await res.json();
      return data?.data || [];
    };

    const tasks = Array.from({ length: pages }, (_, i) => limit(() => fetchPage(i * count)()));
    const results = await Promise.all(tasks);
    return results.flat();
  } catch (error) {
    console.error("Error in fetching candidates:", error);
    throw error;
  }
};

export default defineEndpoint((router, endpointContext) => {
  const { logger, services } = endpointContext;
  const { ItemsService } = services;

  router.get("/clinician/:clinicianId/checklistsummary", async (req: any, res: any) => {
    const services = DirectusServices.fromEndpoint(endpointContext, req);

    const baseFields = [
      "id",
      "first_name",
      "last_name",
      "bullhorn_id",
      "sc_definitions.sc_definitions_id.id",
      "sc_definitions.sc_definitions_id.title",
      "sc_definitions.status",
      "sc_definitions.assigned_on",
      "sc_definitions.due_date",
      "sc_definitions.finished_on",
      "sc_definitions.expires_on",
    ];

    const { clinicianId } = req.params;

    const userData = await services.usersService.readOne(clinicianId, {
      fields: baseFields,
    });

    if (!userData) {
      logger.warn("User not found", { clinicianId });
      return res.status(404).send({ error: "User not found" });
    }

    const response = {
      user_id: userData.id,
      first_name: userData.first_name,
      last_name: userData.last_name,
      bullhorn_id: userData?.bullhorn_id,
      skills_checklist_summary: {
        status: computeStatusSummary(userData.sc_definitions),
        total_items: userData.sc_definitions.length,
        completed_items: userData.sc_definitions.filter(
          (item: any) => item.status === "COMPLETED" || item.status === "DUE DATE EXPIRED",
        ).length,
        pending_items: userData.sc_definitions.filter(
          (item: any) => item.status === "PENDING" || item.status === "NOT STARTED",
        ).length,
      },
    };

    return res.status(200).send(response);
  });

  router.post("/verify", async (req: any, res: any) => {
    try {
      logger.info("Received request to /bullhorn/verify");

      if (req.accountability.role !== UserRole.HSHAdmin) {
        logger.warn("Unauthorized access attempt", { userRole: req.accountability.role });
        return res.status(403).json({ error: "Forbidden: Only HSH Admin can access." });
      }

      if (!validateCredentials(req)) {
        logger.warn("Invalid credentials provided");
        return res.status(400).json({ error: "Missing required credentials" });
      }

      const { client_id, client_secret, client_username, client_password, agency_id } = req.body;
      logger.info("Valid credentials received", { agency_id });

      const bhResource = { client_id, client_secret, client_username, client_password, agency_id };
      const db = new DBService(ItemsService, req.schema, { admin: true });
      const bhDBService = db.get("bh_config");

      const bullhornApi = new BullhornOAuthApi(bhResource);
      logger.info("Attempting Bullhorn login");

      const authData = await bullhornApi.login();
      if (!authData) {
        logger.error("Bullhorn authentication failed", { agency_id });
        return res.status(401).json({ error: "Invalid credentials or authentication failed" });
      }

      logger.info("Bullhorn authentication successful", { agency_id });

      const bhConfigData = {
        client_id,
        client_secret,
        client_username,
        client_password,
        bh_access_token: authData.access_token,
        bh_refresh_token: authData.refresh_token,
        bh_session_key: authData.BhRestToken,
        rest_url: authData.restUrl,
        is_verified: true,
      };

      logger.info("Checking existing Bullhorn configuration", { agency_id });
      const existingBHRecord = await bhDBService.readByQuery({ filter: { agency_id } });

      if (existingBHRecord.length > 0) {
        logger.info("Updating existing Bullhorn config", { agency_id });
        await bhDBService.updateOne(existingBHRecord[0].id, bhConfigData);
      } else {
        logger.info("Creating new Bullhorn config", { agency_id });
        await bhDBService.createOne({ id: uuidv4(), ...bhConfigData, agency_id });
      }
      logger.info("Bullhorn verification completed successfully", { agency_id });
      return res.status(200).json({ message: "Login successful", authData });
    } catch (error) {
      logger.error("Error during Bullhorn verification", { error });
      return res.status(500).json({ error: "Something went wrong during login" });
    }
  });

  router.get("/find/:agency_id", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.HSHAdmin) {
        logger.warn("Unauthorized access attempt", { userRole: req.accountability.role });
        return res.status(403).json({ error: "Forbidden: Only HSH Admin can access." });
      }

      const { agency_id } = req.params;

      if (!agency_id || typeof agency_id !== "string" || agency_id.trim() === "") {
        return res.status(400).json({ error: "Invalid agency_id parameter" });
      }

      const db = new DBService(ItemsService, req.schema, { admin: true });
      const bhDBService = db.get("bh_config");

      let record;
      try {
        [record] = await bhDBService.readByQuery({
          filter: { agency_id: { _eq: agency_id.trim() } },
          limit: 1,
        });
      } catch (dbError) {
        logger.error("Database query failed:", dbError);
        return res.status(500).json({ error: "Database query error" });
      }

      if (!record) {
        return res.status(404).json({ error: "No record found for the given agency" });
      }

      return res.json({ data: record });
    } catch (error) {
      logger.error("Unexpected error fetching Bullhorn configuration:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.post("/checklist-status-valueset", async (req: any, res: any) => {
    try {
      const { agency_id, checklist_enable } = req.body;

      if (!agency_id) return res.status(400).json({ error: "Missing agency_id parameter" });

      const db = new DBService(ItemsService, req.schema, { admin: true });
      const bhDB = db.get("bh_config");

      const [bhConfig] = await bhDB.readByQuery({ filter: { agency_id: { _eq: agency_id } }, limit: 1 });
      if (!bhConfig) return res.status(404).json({ error: "Bullhorn configuration not found" });

      const existingBHRecord = await bhDB.readByQuery({ filter: { agency_id } });

      if (!existingBHRecord || existingBHRecord.length === 0) {
        return res.status(400).json({ error: "Bullhorn record not found" });
      }

      await bhDB.updateOne(existingBHRecord[0].id, { is_enable_mapping_checklist: checklist_enable });

      if (!checklist_enable) {
        return res.status(200).json({ options: [] });
      }
      const bullhornApi = new BullhornOAuthApi({
        client_id: bhConfig.client_id,
        client_secret: bhConfig.client_secret,
        client_username: bhConfig.client_username,
        client_password: bhConfig.client_password,
      });

      const authData = await bullhornApi.login();
      if (!authData) return res.status(401).json({ error: "Invalid credentials or authentication failed" });

      const bhRestToken = authData.BhRestToken;
      const restUrl = bhConfig.rest_url;

      const options = await getCustomText4OptionsId(restUrl, bhRestToken);

      return res.status(200).json({ options });
    } catch (error) {
      logger.error("Unexpected error getting status value set", { error });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.post("/skills-checklist-sync", async (req: any, res: any) => {
    try {
      const { agency_id, bullhorn_id } = req.query;
      const { summaryStatus } = req.body;
      if (!agency_id) return res.status(400).json({ error: "Missing agency_id parameter" });
      if (!bullhorn_id) return res.status(400).json({ error: "Missing bullhorn_id parameter" });
      if (!summaryStatus) return res.status(400).json({ error: "No summary Status" });

      const db = new DBService(ItemsService, req.schema, { admin: true });
      const bhDB = db.get("bh_config");

      const [bhConfig] = await bhDB.readByQuery({ filter: { agency_id: { _eq: agency_id } }, limit: 1 });
      if (!bhConfig) return res.status(404).json({ error: "Bullhorn configuration not found" });

      const bullhornApi = new BullhornOAuthApi({
        client_id: bhConfig.client_id,
        client_secret: bhConfig.client_secret,
        client_username: bhConfig.client_username,
        client_password: bhConfig.client_password,
      });

      const authData = await bullhornApi.login();
      if (!authData) return res.status(401).json({ error: "Invalid credentials or authentication failed" });

      const bhConfigData = {
        bh_access_token: authData.access_token,
        bh_refresh_token: authData.refresh_token,
        bh_session_key: authData.BhRestToken,
      };

      const existingBHRecord = await bhDB.readByQuery({ filter: { agency_id } });
      if (existingBHRecord.length > 0) await bhDB.updateOne(existingBHRecord[0].id, bhConfigData);

      const response = await fetch(`${bhConfig.rest_url}/entity/Candidate/${bullhorn_id}`, {
        method: "POST",
        headers: {
          BhRestToken: authData.BhRestToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customText4: summaryStatus,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        logger.error("Failed to update Bullhorn Candidate", { response: result });
        return res.status(response.status).json({ error: "Failed to update Bullhorn Candidate", details: result });
      }

      return res.status(200).json({ message: "Candidate updated successfully", result });
    } catch (error) {
      logger.error("Unexpected error during candidate sync", { error });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.post("/upload-from-file", async (req: any, res: any) => {
    try {
      const { candidate_id, agency_id, file_path, filename, fileType } = req.body;

      if (!candidate_id?.bullhorn_id || !agency_id || !file_path || !filename || !fileType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return res.status(400).json({ error: "Invalid filename" });
      }

      const resolvedPath = path.resolve(BASE_UPLOAD_DIR, file_path);

      if (!resolvedPath.startsWith(BASE_UPLOAD_DIR)) {
        return res.status(400).json({ error: "Invalid file path" });
      }

      if (!fs.existsSync(resolvedPath)) {
        return res.status(400).json({ error: "File not found at the given path" });
      }

      const fileBuffer = fs.readFileSync(resolvedPath);
      const fileBlob = new Blob([fileBuffer], { type: "application/pdf" });

      const db = new DBService(ItemsService, req.schema, { admin: true });
      const bhDB = db.get("bh_config");

      const [bhConfig] = await bhDB.readByQuery({
        filter: { agency_id: { _eq: agency_id } },
        limit: 1,
      });

      if (!bhConfig) {
        return res.status(404).json({ error: "Bullhorn config not found" });
      }

      const bullhornApi = new BullhornOAuthApi({
        client_id: bhConfig.client_id,
        client_secret: bhConfig.client_secret,
        client_username: bhConfig.client_username,
        client_password: bhConfig.client_password,
      });

      const authData = await bullhornApi.login();

      if (!authData) {
        return res.status(401).json({ error: "Authentication failed" });
      }

      const uploadUrl = `${bhConfig.rest_url}file/Candidate/${candidate_id.bullhorn_id}/raw?externalID=Portfolio&fileType=${fileType}`;
      const headers = {
        BhRestToken: authData.BhRestToken,
      };

      const formData = new FormData();
      formData.append("file", fileBlob, filename);
      formData.append("candidateID", candidate_id.bullhorn_id);
      formData.append("fileType", fileType);
      formData.append("externalID", `Portfolio-${filename}`);

      const bhRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: headers,
        body: formData,
      });

      if (!bhRes.ok) {
        const text = await bhRes.text();
        return res.status(bhRes.status).json({ error: "Upload failed", details: text });
      }

      const result = await bhRes.json();

      return res.json({ message: "Uploaded to Bullhorn", result });
    } catch (err) {
      console.error("Error uploading file to Bullhorn:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  //Syncing Profiles from BH to V2 via Settings
  router.get("/candidates", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.HSHAdmin) {
        logger.warn("Unauthorized access attempt", { userRole: req.accountability.role });
        return res.status(403).json({ error: "Forbidden: Only HSH Admin can access." });
      }

      logger.info("Received request to fetch candidates");

      const { agency_id } = req.query;
      if (!agency_id) {
        return res.status(400).json({ error: "Missing agency_id parameter" });
      }

      const db = new DBService(ItemsService, req.schema, { admin: true });
      const usersDB = db.get("directus_users");
      const agencyUsersDb = db.get("junction_directus_users_agencies");

      const { config, authData } = await getBullhornConfig(db, agency_id);
      const candidates = await fetchAllCandidates(config.rest_url, authData.BhRestToken);

      const uniqueCandidates = candidates.reduce((acc: any[], candidate) => {
        const email = candidate.email?.trim().toLowerCase();
        if (email && !acc.some((c) => c.email === email)) {
          acc.push({ ...candidate, email });
        }
        return acc;
      }, []);

      const existing = await usersDB.readByQuery({
        filter: { email: { _in: uniqueCandidates.map((c) => c.email) } },
        fields: ["email", "id", "first_name", "last_name"],
      });

      const existingEmails = new Set(existing.map((u: { email: string }) => u.email));
      const newCandidates = uniqueCandidates.filter((c) => !existingEmails.has(c.email));

      let createdCount = 0;
      let failedCount = 0;
      const syncLogs: any[] = [];

      for (const candidate of newCandidates) {
        const { firstName, lastName, email, id } = candidate;

        try {
          const createResponse = await usersDB.createOne({
            first_name: firstName,
            last_name: lastName,
            email,
            role: UserRole.Clinician,
            agencies: [
              {
                agencies_id: { id: agency_id },
                bullhorn_id: id,
              },
            ],
          });

          if (createResponse) {
            createdCount++;
            syncLogs.push({
              email,
              first_name: firstName,
              last_name: lastName,
              status: "success",
              reason: "",
            });
            logger.info(`User created: ${email}`);
          } else {
            failedCount++;
            syncLogs.push({
              email,
              first_name: firstName,
              last_name: lastName,
              status: "failed",
              reason: "Failed to create user",
            });
            logger.warn(`Failed to create user: ${email}`);
          }
        } catch (error: any) {
          failedCount++;
          syncLogs.push({
            email,
            first_name: firstName,
            last_name: lastName,
            status: "error",
            reason: error.message,
          });
          logger.error(`Error creating user: ${email}`, { error });
        }
      }

      let updatedCount = 0;

      for (const candidate of uniqueCandidates) {
        if (!existingEmails.has(candidate.email)) continue;

        const existingUser = existing.find((u: { email: any }) => u.email === candidate.email);
        if (!existingUser) continue;

        const { id: existingUserId, first_name: existingFirstName, last_name: existingLastName } = existingUser;

        if (existingFirstName === candidate.firstName && existingLastName === candidate.lastName) continue;

        try {
          const updateData: any = {
            first_name: candidate.firstName,
            last_name: candidate.lastName,
          };

          await usersDB.updateOne(existingUserId, updateData);

          const existingAssociation = await agencyUsersDb.readByQuery({
            filter: {
              directus_users_id: existingUserId,
              agencies_id: { id: agency_id },
            },
          });

          if (existingAssociation && existingAssociation.length > 0) continue;

          const createResponse = await agencyUsersDb.createOne({
            agencies_id: { id: agency_id },
            directus_users_id: existingUserId,
            bullhorn_id: candidate.id,
          });

          if (createResponse) {
            updatedCount++;
            syncLogs.push({
              email: candidate.email,
              first_name: candidate.firstName,
              last_name: candidate.lastName,
              status: "success",
              reason: "",
            });
            logger.info(`User ${candidate.email} updated and associated with agency ${agency_id}`);
          } else {
            syncLogs.push({
              email: candidate.email,
              first_name: candidate.firstName,
              last_name: candidate.lastName,
              status: "failed",
              reason: "Failed to associate user with agency",
            });
            logger.warn(`Failed to associate user ${candidate.email} with agency ${agency_id}`);
          }
        } catch (error: any) {
          syncLogs.push({
            email: candidate.email,
            first_name: candidate.firstName,
            last_name: candidate.lastName,
            status: "failed",
            reason: error.message,
          });
          logger.error(`Error updating user ${candidate.email} and associating with agency ${agency_id}`, {
            error,
          });
        }
      }

      const message = `Sync completed: ${createdCount} new profiles created, ${failedCount} failed, ${updatedCount} users updated with new agency.`;

      const syncResults = syncLogs.map((result: any) => ({
        email: result.email,
        first_name: result.first_name,
        last_name: result.last_name,
        status: result.status,
        reason: result.reason || "",
      }));

      return res.status(200).json({
        message,
        candidates: newCandidates,
        updatedCandidates: updatedCount,
        logs: syncResults,
      });
    } catch (err: any) {
      logger.error("Error in /candidates route", { err });
      return res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
    }
  });

  //Syncing Profiles From V2 to BH Via Settings
  router.get("/sync-bullhorn", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.HSHAdmin) {
        logger.warn("Unauthorized access attempt", { userRole: req.accountability.role });
        return res.status(403).json({ error: "Forbidden: Only HSH Admin can access." });
      }

      logger.info("Received request to sync candidates");

      const { agency_id, start = 0, count = 1000 } = req.query;
      if (!agency_id) return res.status(400).json({ error: "Missing agency_id parameter" });

      const db = new DBService(ItemsService, req.schema, { admin: true });
      const usersDB = db.get("directus_users");
      const junctionDB = db.get("junction_directus_users_agencies");

      const userIds =
        (
          await junctionDB.readByQuery({
            filter: { agencies_id: { _eq: agency_id } },
            limit: count,
            offset: start,
            fields: ["directus_users_id"],
          })
        )?.map((entry: { directus_users_id: any }) => entry.directus_users_id) || [];

      if (userIds.length === 0) return res.status(200).json({ message: "No users found for this agency" });

      const clinicians = await usersDB.readByQuery({
        filter: { id: { _in: userIds }, role: { _eq: UserRole.Clinician } },
        fields: ["id", "email", "first_name", "last_name"],
      });

      if (clinicians.length === 0) return res.status(200).json({ message: "No clinicians found for this agency" });

      const { config, authData } = await getBullhornConfig(db, agency_id);

      let existingCandidates = [];
      let currentPage = 1;

      while (true) {
        const response = await fetchWithRetry(
          `${config.rest_url}/search/Candidate?query=isDeleted:0 AND NOT status:Archive&fields=id,email&count=500&page=${currentPage}`,
          { method: "GET", headers: { BhRestToken: config.bh_session_key } },
        );

        if (!response.ok) {
          logger.error(`Failed to fetch candidates (status: ${response.status})`);
          return res.status(response.status).json({ error: "Failed to fetch existing candidates" });
        }

        const data = await response.json();

        if (!data || !data.data) {
          logger.error("Invalid response data format from Bullhorn API");
          return res.status(500).json({ error: "Invalid response format from Bullhorn API" });
        }

        existingCandidates.push(...(data.data || []));

        if (data.data.length < 500) break;

        currentPage++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const existingEmails = new Set(existingCandidates.map((c) => c.email?.toLowerCase()));
      const newCandidates = clinicians.filter(
        (user: { email: string }) => !existingEmails.has(user.email.toLowerCase()),
      );

      if (newCandidates.length === 0)
        return res.status(200).json({ message: "All clinicians are already in Bullhorn" });

      const syncLogs: string[] = [];
      let successCount = 0;

      const syncCandidate = async (candidate: any, index: number) => {
        const label = `Candidate ${index + 1} (${candidate.email})`;

        const payload = {
          firstName: candidate.first_name,
          lastName: candidate.last_name,
          name: `${candidate.first_name} ${candidate.last_name}`,
          email: candidate.email,
          status: "Active",
        };

        if (!candidate.first_name || !candidate.last_name || !candidate.email) {
          const reason = "Missing required fields";
          syncLogs.push(`${label} — failed Reason: ${reason}`);
          return { ...candidate, status: "failed", reason };
        }

        try {
          const response = await fetchWithRetry(`${config.rest_url}/entity/Candidate`, {
            method: "PUT",
            headers: {
              BhRestToken: authData.BhRestToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const responseBody = await response.text();
            syncLogs.push(`${label} — failed. Reason: ${responseBody}`);
            return { ...candidate, status: "failed", reason: responseBody };
          }

          const result = await response.json();
          syncLogs.push(`${label} — done`);
          successCount++;
          return { ...candidate, status: "success", bullhornId: result.changedEntityId };
        } catch (error: any) {
          syncLogs.push(`${label} — error. Reason: ${error.message}`);
          return { ...candidate, status: "failed", reason: error.message };
        }
      };

      const results = await Promise.all(
        newCandidates.map((candidate: any, index: number) => limit(() => syncCandidate(candidate, index))),
      );

      const syncResults = results.map((result: any) => ({
        email: result.email,
        first_name: result.first_name,
        last_name: result.last_name,
        status: result.status,
        reason: result.reason || "",
      }));

      logger.info(`Successfully synced ${successCount} candidates to Bullhorn`);

      return res.status(200).json({
        synced: successCount,
        total: newCandidates.length,
        logs: syncResults,
      });
    } catch (error) {
      logger.error("Unexpected error during candidate sync", { error });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  //Sync By one From V2 to Bullhorn Via User List
  router.post("/sync-by-one", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.HSHAdmin && req.accountability.role !== UserRole.AgencyUser) {
        logger.warn("Unauthorized access attempt", { userRole: req.accountability.role });
        return res.status(403).json({ error: "Forbidden: Only HSH Admin can access." });
      }

      const { clinician_id, agency_id } = req.body;

      if (!clinician_id || !agency_id) {
        return res.status(400).json({ error: "Missing clinicianId or agency_id parameter" });
      }

      const db = new DBService(ItemsService, req.schema, { admin: true });
      const usersDB = db.get("directus_users");

      const clinician = await usersDB.readByQuery({
        filter: {
          id: { _eq: clinician_id },
          role: { _eq: UserRole.Clinician },
        },
        fields: ["id", "email", "first_name", "last_name"],
      });

      if (!clinician.length) {
        return res.status(404).json({ error: "Clinician not found" });
      }

      const { config, authData } = await getBullhornConfig(db, agency_id);

      const clinicianData = clinician[0];
      const payload = {
        firstName: clinicianData.first_name,
        lastName: clinicianData.last_name,
        name: `${clinicianData.first_name} ${clinicianData.last_name}`,
        email: clinicianData.email,
        status: "Active",
      };

      const response = await fetch(`${config.rest_url}/entity/Candidate`, {
        method: "PUT",
        headers: {
          BhRestToken: authData.BhRestToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return res.status(500).json({ error: "Failed to sync clinician to Bullhorn" });
      }

      const result = await response.json();

      return res.status(200).json({
        message: "Clinician successfully synced to Bullhorn",
        candidate_id: result.changedEntityId,
      });
    } catch (error) {
      logger.error("Unexpected error during clinician sync", { error });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  //Syncing Profile from BH to HSH by 1
  router.get("/candidate/:candidate_id", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.PlatformUser) {
        logger.warn("Unauthorized access attempt", { userRole: req.accountability.role });
        return res.status(403).json({ error: "Forbidden: Only Platform User can access." });
      }

      logger.info("Received request to fetch candidate details");

      const { candidate_id } = req.params;
      const { agency_id } = req.query;

      if (!agency_id) {
        logger.info("Missing agency_id in request");
        return res.status(400).json({ error: "Missing agency_id parameter" });
      }

      const db = new DBService(ItemsService, req.schema, { admin: true });
      const userService = db.get("directus_users");

      const { config, authData } = await getBullhornConfig(db, agency_id);

      logger.info("Fetching candidate details from Bullhorn", { candidate_id, agency_id });
      const response = await fetch(
        `${config.rest_url}/entity/Candidate/${candidate_id}?fields=id,firstName,lastName,email`,
        {
          method: "GET",
          headers: {
            BhRestToken: authData.BhRestToken,
          },
        },
      );

      if (!response.ok) {
        logger.info("Failed to fetch candidate details from Bullhorn:", await response.text());
        return res.status(response.status).json({ error: "Failed to fetch candidate details" });
      }

      const candidateDetails = await response.json();
      if (!candidateDetails.data || Object.keys(candidateDetails.data).length === 0) {
        logger.info("Empty candidate data received from Bullhorn", { candidate_id });
        return res.status(404).json({ error: "Candidate not found" });
      }

      const { id, firstName, lastName, email } = candidateDetails.data;
      const cleanedEmail = email?.trim().toLowerCase();

      const userExists = await userService.readByQuery({
        filter: { email: { _eq: cleanedEmail } },
        limit: 1,
        fields: ["id"],
      });

      if (userExists.length > 0) {
        const user_id = userExists[0].id;
        logger.info(`User with email ${cleanedEmail} already exists`);
        return res.status(200).json({
          data: {
            user_id,
            id,
            firstName,
            lastName,
            email,
            userExists: true,
          },
        });
      } else {
        logger.info(`No user found with email ${cleanedEmail}`);
        return res.status(200).json({
          data: {
            id,
            firstName,
            lastName,
            email,
            userExists: false,
          },
        });
      }
    } catch (error) {
      logger.error("Error fetching candidate details:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
