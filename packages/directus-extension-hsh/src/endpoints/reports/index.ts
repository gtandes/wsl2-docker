import { defineEndpoint } from "@directus/extensions-sdk";
import { DBService } from "../../common/services";
import { format, subHours, parse, isValid } from "date-fns";
import { CompetencyState, CompetencyType, UserRole } from "types";
import { v4 as uuidv4 } from "uuid";

import { createGzip } from "zlib";
import { stringify } from "csv-stringify";
import { ExamQuestionPassService, ExamQuestionResult, QuestionStat } from "../../services/ExamQuestionPassService";

const LOG_PREFIX = "REPORTS";

interface CompetencyStats extends Record<AttemptKeys, number> {
  itemTitle: string;
  modalityTitle: string;
  total: number;
  passed: number;
  neverPassed: number;
  score: number[];
}

type AgencyPassRateStats = {
  modality: string;
  itemTitle: string;
  agencyPassed: number;
  agencyFailed: number;
  otherAgencyPassed: number;
  otherAgencyFailed: number;
};

enum ANCCReportStatus {
  COMPLETED = "completed",
  DOWNLOADED = "downloaded",
  GENERATING = "generating",
  FAILED = "failed",
}

type AttemptKeys =
  | "attemptsUsedOne"
  | "attemptsUsedTwo"
  | "attemptsUsedThree"
  | "attemptsUsedN"
  | "passedOnAttemptOne"
  | "passedOnAttemptTwo"
  | "passedOnAttemptThree"
  | "passedOnAttemptN"
  | "totalOnAttemptOne"
  | "totalOnAttemptTwo"
  | "totalOnAttemptThree"
  | "totalOnAttemptN";

const jobQueue: string[] = [];

const initializeCompetencyStats = (title: string, modality: string): CompetencyStats => ({
  itemTitle: title ?? "Unknown",
  modalityTitle: modality ?? "Unknown",
  total: 0,
  passed: 0,
  neverPassed: 0,
  passedOnAttemptOne: 0,
  passedOnAttemptTwo: 0,
  passedOnAttemptThree: 0,
  passedOnAttemptN: 0,
  totalOnAttemptOne: 0,
  totalOnAttemptTwo: 0,
  totalOnAttemptThree: 0,
  totalOnAttemptN: 0,
  attemptsUsedOne: 0,
  attemptsUsedTwo: 0,
  attemptsUsedThree: 0,
  attemptsUsedN: 0,
  score: [],
});

/**
 * Format a date to the required string format.
 */
const formatDate = (date: Date): string => {
  return format(date, "yyyy-MM-dd HH:mm:ss.SSS XXX");
};

/**
 * Generate CSV content from an array of user data.
 */
const generateCSV = (data: any[], headers: string[]): string => {
  const csvHeaders = headers.join(",");
  const csvRows = data.map((user: any) => {
    const formattedDate = format(new Date(user.date_created), "yyyy-MM-dd HH:mm:ss");
    return [user.first_name, user.last_name, user.email, user.agencies_id.name, formattedDate].join(",");
  });
  return [csvHeaders, ...csvRows].join("\n");
};

const generateReportCSV2 = (
  dataSources: { data: Record<string, CompetencyStats>; type: string }[],
  headers: string[],
): string => {
  const csvHeaders = [headers.map((header) => `"${header}"`).join(",")];

  const safeDivide = (numerator: number, denominator: number) =>
    denominator === 0 ? "0%" : ((numerator / denominator) * 100).toFixed(2) + "%";

  const csvRows = dataSources.flatMap(({ data, type }) =>
    Object.values(data).map((item: CompetencyStats) => {
      return [
        `"${type}"`,
        `"${item.itemTitle}"`,
        `"${item.modalityTitle}"`,
        item.total,
        item.passed,
        safeDivide(item.passed, item.total),
        item.passedOnAttemptOne,
        safeDivide(item.passedOnAttemptOne, item.totalOnAttemptOne),
        item.passedOnAttemptTwo,
        safeDivide(item.passedOnAttemptTwo, item.totalOnAttemptTwo),
        safeDivide(item.passedOnAttemptOne + item.passedOnAttemptTwo, item.total),
        item.passedOnAttemptThree,
        safeDivide(item.passedOnAttemptThree, item.totalOnAttemptThree),
        item.passedOnAttemptThree !== 0
          ? safeDivide(item.passedOnAttemptTwo + item.passedOnAttemptOne + item.passedOnAttemptThree, item.total)
          : "0%",
        item.passedOnAttemptN,
        safeDivide(item.passedOnAttemptN, item.totalOnAttemptN),
        item.passedOnAttemptN !== 0
          ? safeDivide(
              item.passedOnAttemptTwo + item.passedOnAttemptOne + item.passedOnAttemptThree + item.passedOnAttemptN,
              item.total,
            )
          : 0,
        item.neverPassed,
        (item.score.reduce((a, b) => a + b, 0) / item.score.length).toFixed(2).toString() + "%",
      ].join(",");
    }),
  );

  return [csvHeaders, ...csvRows].join("\n");
};

const generateReportAgencyPassRateCSVText = (
  dataSources: { data: Record<string, AgencyPassRateStats>; type: string }[],
  headers: string[],
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const safeDivide = (numerator: number, denominator: number) =>
      denominator === 0 ? "0" : ((numerator / denominator) * 100).toFixed(2);

    const csvStream = stringify({ header: true, columns: headers });

    let csvContent = "";

    csvStream.on("data", (chunk) => {
      csvContent += chunk.toString();
    });

    csvStream.on("error", (error) => {
      reject(error);
    });

    csvStream.on("end", () => {
      resolve(csvContent);
    });

    (async () => {
      for (const { data, type } of dataSources) {
        for (const item of Object.values(data)) {
          if (item.agencyPassed > 0 || item.agencyFailed > 0)
            csvStream.write([
              type,
              item.itemTitle,
              item.modality,
              `${safeDivide(item.agencyPassed, item.agencyPassed + item.agencyFailed)}%`,
              `${safeDivide(item.otherAgencyPassed, item.otherAgencyPassed + item.otherAgencyFailed)}%`,
            ]);
        }
      }
      csvStream.end();
    })();
  });
};

/**
 * Batch fetching of competency data.
 */
const fetchItemDetailsInConcurrentBatches = async (
  service: any,
  filter: any,
  competencyTypeEquivalent: string,
  batchSize = 1000,
  concurrencyLimit = 5,
): Promise<any[]> => {
  let batchOffset = 0;
  let allItemDetails: any[] = [];
  let moreData = true;

  const fetchBatch = async (offset: number) => {
    const fields = [
      "attempts_used",
      "status",
      "score",
      `${competencyTypeEquivalent}.title`,
      `${competencyTypeEquivalent}.modality.title`,
      "agency",
      "allowed_attempts",
      "id",
      competencyTypeEquivalent === "modules_definition_id" ? "approved" : "score_history",
    ];

    return service.readByQuery({
      fields,
      filter,
      limit: batchSize,
      offset,
    });
  };

  while (moreData) {
    const promises = [];
    for (let i = 0; i < concurrencyLimit; i++) {
      promises.push(fetchBatch(batchOffset + i * batchSize));
    }

    const results = await Promise.all(promises);
    let fetchedData: any = [];

    results.forEach((batch) => {
      fetchedData = fetchedData.concat(batch);
    });
    if (fetchedData.length === 0) {
      moreData = false;
    } else {
      allItemDetails = allItemDetails.concat(fetchedData);
      batchOffset += batchSize * concurrencyLimit;
    }
  }

  return allItemDetails;
};

const fetchItemDetailsInConcurrentBatchesv2 = async (
  service: any,
  filter: any,
  competencyTypeEquivalent: string,
  batchSize = 500,
  concurrencyLimit = 5,
): Promise<any[]> => {
  const fields = [
    "id",
    "attempts_used",
    "status",
    "score",
    "allowed_attempts",
    "directus_users_id",
    "finished_on",
    competencyTypeEquivalent === "modules_definition_id" ? "approved" : "score_history",
    `${competencyTypeEquivalent}.title`,
    `${competencyTypeEquivalent}.modality.title`,
    `${competencyTypeEquivalent}.id`,
  ];

  let offset = 0;
  const latestAttemptsMap = new Map<string, any>();
  let hasMoreData = true;

  const fetchBatch = async (offset: number) => {
    const batch = await service.readByQuery({
      fields,
      filter,
      limit: batchSize,
      offset,
      sort: ["-finished_on"],
    });

    return batch;
  };

  while (hasMoreData) {
    const batchPromises = Array.from({ length: concurrencyLimit }, (_, i) => fetchBatch(offset + i * batchSize));

    const results = await Promise.all(batchPromises);
    const fetchedData = results.flat();

    if (fetchedData.length === 0) {
      hasMoreData = false;
    } else {
      fetchedData.forEach((item) => {
        const key = `${item.directus_users_id}-${competencyTypeEquivalent}-${
          item[competencyTypeEquivalent]?.id || item.id
        }`;

        if (
          !latestAttemptsMap.has(key) ||
          new Date(item.finished_on) > new Date(latestAttemptsMap.get(key).finished_on)
        ) {
          latestAttemptsMap.set(key, item);
        }
      });

      offset += batchSize * concurrencyLimit;
    }
  }

  return Array.from(latestAttemptsMap.values());
};

function escapeCSVField(field: any): string {
  if (field === null || field === undefined) return "";
  const value = String(field);
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default defineEndpoint((router, { services, logger, database }) => {
  const { ItemsService } = services;

  router.get("/exam-pass-rate-v2", async (req: any, res: any) => {
    if (req.accountability.role !== UserRole.HSHAdmin) {
      return res.status(400).send({ status: 400, message: "Unauthorized" });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ status: 400, message: "Both startDate and endDate must be provided." });
    }

    const parsedStartDate = parse(startDate as string, "yyyy-MM-dd", new Date());
    const parsedEndDate = parse(endDate as string, "yyyy-MM-dd", new Date());

    if (!isValid(parsedStartDate) || !isValid(parsedEndDate)) {
      return res.send(400, { status: 400, message: "Invalid date format. Use yyyy-MM-dd." });
    }

    if (parsedStartDate > parsedEndDate) {
      return res.send(400, { status: 400, message: "Start date cannot be greater than end date." });
    }
    parsedEndDate.setDate(parsedEndDate.getDate() + 1);

    const db = new DBService(ItemsService, req.schema, { admin: true });
    const reportService = db.get("ancc_reports");
    const uuid = uuidv4();

    try {
      res.status(202).send({ status: 202, message: "Report generation started", uuid });

      const generateReport = async () => {
        await reportService.createOne({
          id: uuid,
          file_content: "",
          created_at: new Date(),
          type: `exam-question-pass-rate`,
          status: ANCCReportStatus.GENERATING,
          created_by: req.accountability.user,
        });

        let csvContent = "";

        const examQuestionPassService = new ExamQuestionPassService(database, logger);

        const examResults: ExamQuestionResult[] = await examQuestionPassService.getExamQuestionResults({
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          agency: req.query?.agency ?? null,
          selectedQuestion: req.query?.selectedQuestion ?? null,
          title: req.query?.title ?? null,
        });

        if (!examResults || examResults.length === 0) {
          throw new Error("Unable to Generate report, Selected filter does not have data");
        }

        const questionStats: Map<string, QuestionStat> = await examQuestionPassService.processExamResults(examResults);

        const headers = [
          "Exam Title",
          "Question",
          "Status",
          "Total attempts",
          "Option A Tally",
          "Option B Tally",
          "Option C Tally",
          "Option D Tally",
          "Correct Option Answer",
          "Correct Percentage",
        ]
          .map((header) => escapeCSVField(header))
          .join(",");

        csvContent = headers + "\n";

        const resultMap = new Map(examResults.map((result) => [result.questions_id_id, result]));
        const rows: string[] = [];

        for (const [questionId, stat] of questionStats) {
          const result = resultMap.get(questionId);
          if (!result) continue;

          let correctPercent = 0;

          switch (stat.correctOption) {
            case "A":
              correctPercent = stat.totalAttempts > 0 ? (stat.optionTallies.A / stat.totalAttempts) * 100 : 0;
              break;
            case "B":
              correctPercent = stat.totalAttempts > 0 ? (stat.optionTallies.B / stat.totalAttempts) * 100 : 0;
              break;
            case "C":
              correctPercent = stat.totalAttempts > 0 ? (stat.optionTallies.C / stat.totalAttempts) * 100 : 0;
              break;
            case "D":
              correctPercent = stat.totalAttempts > 0 ? (stat.optionTallies.D / stat.totalAttempts) * 100 : 0;
              break;
          }

          const row = [
            escapeCSVField(result.exam_title),
            escapeCSVField(stat.questionTitle || ""),
            escapeCSVField(stat.status),
            escapeCSVField(stat.totalAttempts.toString()),
            escapeCSVField(stat.optionTallies.A.toString()),
            escapeCSVField(stat.optionTallies.B.toString()),
            escapeCSVField(stat.optionTallies.C.toString()),
            escapeCSVField(stat.optionTallies.D.toString()),
            escapeCSVField(stat.correctOption),
            escapeCSVField(correctPercent.toFixed(2) + "%"),
          ].join(",");

          rows.push(row);
        }
        csvContent += rows.join("\n") + "\n";

        await reportService.updateOne(uuid, {
          file_content: csvContent,
          status: ANCCReportStatus.COMPLETED,
        });
      };

      await generateReport().catch(async (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "An error occurred";
        await reportService.updateOne(uuid, { file_content: errorMessage, status: ANCCReportStatus.FAILED });
        logger.error(`Error in background report generation: ${error}`);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      await reportService.updateOne(uuid, { file_content: errorMessage, status: ANCCReportStatus.FAILED });
      logger.error(`Error fetching exam results: ${error}`);
      return res.status(500).json({ status: 500, message: "Internal server error." });
    }
  });

  /**
   * Retrieve user registrations in the last 24 hours.
   */
  router.get("/daily-registrations", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.HSHAdmin) {
        return res.sendStatus(403, { status: 403, message: "Forbidden : Only HSH Admin can access." });
      }
      const db = new DBService(ItemsService, req.schema, req.accountability);

      const userServices = db.get("junction_directus_users_agencies");

      const today = new Date();
      const todayStart = formatDate(subHours(today, 24));
      const todayEnd = formatDate(today);

      const newUsers = await userServices.readByQuery({
        filter: {
          date_created: {
            _between: [todayStart, todayEnd],
          },
          agencies_id: {
            id: {
              _eq: req.query["agencyId"],
            },
          },
        },
        fields: ["*", "agencies_id.name"],
      });

      if (!newUsers || newUsers.length === 0) {
        return res.status(200).send({ message: "No user registrations found in the last 24 hours." });
      }

      const csv = generateCSV(newUsers, ["First Name", "Last Name", "Email", "Agency", "Date Created"]);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="daily-registrations.csv"');

      return res.status(200).send(csv);
    } catch (e: any) {
      logger.error(`${LOG_PREFIX}: ${e}`);
      return res.status(500).send({ status: 500, message: e.message || "Internal server error" });
    }
  });

  const sseClients: Record<string, any[]> = {};

  router.get("/pass-rate-per-modality", async (req: any, res: any) => {
    if (req.accountability.role !== UserRole.HSHAdmin) {
      return res.status(400).send({ status: 400, message: "Unauthorized" });
    }
    const db = new DBService(ItemsService, req.schema, { admin: true });
    const reportService = db.get("ancc_reports");
    const uuid = uuidv4();
    try {
      res.status(202).send({ status: 202, message: "Report generation started", uuid: uuid });

      (async () => {
        const examsJunctionService = db.get("junction_directus_users_exams");
        const modulesJunctionService = db.get("junction_modules_definition_directus_users");
        const filterCompetencyType = req.query.type || null;

        await reportService.createOne({
          id: uuid,
          file_content: "",
          created_at: new Date(),
          type: "pass-rate-per-modality",
          status: ANCCReportStatus.GENERATING,
          created_by: req.accountability.user,
        });

        let data: { modules: Record<string, CompetencyStats>; exams: Record<string, CompetencyStats> } = {
          modules: {},
          exams: {},
        };

        const updateReportStatus = async (status: any, progress: any, message: any) => {
          await reportService.updateOne(uuid, {
            status,
            progress,
            message,
          });

          const clients = sseClients[uuid] || [];
          clients.forEach((client) => client.send({ status, progress, message }));
        };

        const updateItemData = (itemStats: any, itemData: CompetencyStats | undefined) => {
          if (!itemData) return;

          const { attempts_used: attemptsCount, status } = itemStats;
          const passedStates = new Set([CompetencyState.FINISHED, CompetencyState.COMPLETED]);

          itemData.total += 1;
          const attemptKeys: Record<number, { passKey: AttemptKeys; totalKey: AttemptKeys }> = {
            1: { passKey: "passedOnAttemptOne", totalKey: "totalOnAttemptOne" },
            2: { passKey: "passedOnAttemptTwo", totalKey: "totalOnAttemptTwo" },
            3: { passKey: "passedOnAttemptThree", totalKey: "totalOnAttemptThree" },
          };

          const passKey = attemptKeys[attemptsCount]?.passKey ?? "passedOnAttemptN";

          if (passedStates.has(status)) {
            itemData.passed += 1;
            itemData[passKey] += 1;
          }
          if (
            attemptsCount >= itemStats.allowed_attempts &&
            (status === CompetencyState.FAILED || status === CompetencyState.FAILED_TIMED_OUT)
          ) {
            itemData.neverPassed += 1;
          }

          for (let i = 1; i <= attemptsCount; i++) {
            const lowerTotalKey = attemptKeys[i]?.totalKey ?? "totalOnAttemptN";
            itemData[lowerTotalKey] += 1;
          }

          const scoreHistory = itemStats.score_history || false;

          if (scoreHistory && scoreHistory.length > 0) {
            scoreHistory.forEach((record: any) => {
              if (Number.isInteger(record.score)) {
                itemData.score.push(record.score);
              }
            });
          }
        };

        const updateItemDataModule = (
          itemStats: {
            attempts_used: number;
            allowed_attempts: number;
            approved?: boolean | null;
          },
          itemData?: CompetencyStats,
        ) => {
          if (!itemData) return;

          const { attempts_used: attemptsCount, approved } = itemStats;

          itemData.total += 1;

          const attemptKeys: Record<number, { passKey: AttemptKeys; totalKey: AttemptKeys }> = {
            1: { passKey: "passedOnAttemptOne", totalKey: "totalOnAttemptOne" },
            2: { passKey: "passedOnAttemptTwo", totalKey: "totalOnAttemptTwo" },
            3: { passKey: "passedOnAttemptThree", totalKey: "totalOnAttemptThree" },
          };

          const passKey = attemptKeys[attemptsCount]?.passKey ?? "passedOnAttemptN";
          if (approved) {
            itemData.passed++;
            itemData[passKey]++;
          } else {
            itemData.neverPassed += 1;
          }

          for (let i = 1; i <= attemptsCount; i++) {
            const totalKey = attemptKeys[i]?.totalKey ?? "totalOnAttemptN";
            itemData[totalKey] += 1;
          }
        };

        const fetchCompetencyData = async (
          type: string,
          junctionService: any,
          targetData: Record<string, CompetencyStats>,
          moduleResultsMap?: Record<string, number> | null,
        ) => {
          const competencyTypeEquivalent = type === CompetencyType.MODULE ? "modules_definition_id" : "exams_id";

          const filter = {
            _and: [
              ...(req.query.title
                ? [
                    {
                      [competencyTypeEquivalent]: { _eq: req.query.title },
                    },
                  ]
                : []),

              ...(req.query.modality
                ? [
                    {
                      [competencyTypeEquivalent]: {
                        modality: { _eq: req.query.modality },
                      },
                    },
                  ]
                : []),
            ],
            status: {
              _in: [
                CompetencyState.COMPLETED,
                CompetencyState.FINISHED,
                CompetencyState.FAILED,
                CompetencyState.FAILED_TIMED_OUT,
              ],
            },
            ...(req.query.startDate &&
              req.query.endDate && {
                finished_on: { _between: [`${req.query.startDate}T00:00:00`, `${req.query.endDate}T23:59:59`] },
              }),
            ...(req.query.agency && { agency: { _eq: req.query.agency } }),
          };

          const itemDetails = await fetchItemDetailsInConcurrentBatchesv2(
            junctionService,
            filter,
            competencyTypeEquivalent,
            1000,
          );

          itemDetails.forEach((itemStats) => {
            const title = itemStats.exams_id?.title || itemStats.modules_definition_id?.title || "Unknown Title";
            const modalityTitle =
              itemStats.exams_id?.modality?.title || itemStats.modules_definition_id?.modality?.title || "N/A";
            const id = itemStats.exams_id?.id || itemStats.modules_definition_id?.id;

            const itemKey = `${competencyTypeEquivalent}-${id}-${title}`;

            if (!targetData[itemKey]) {
              targetData[itemKey] = initializeCompetencyStats(title, modalityTitle);
            }

            if (type === CompetencyType.MODULE) {
              updateItemDataModule(itemStats, targetData[itemKey]);
              if (moduleResultsMap && moduleResultsMap[id]) {
                targetData[itemKey]!.score.push(moduleResultsMap[id] || 0);
              }
            } else {
              updateItemData(itemStats, targetData[itemKey]);
            }
          });
        };

        if (!filterCompetencyType || filterCompetencyType === "modules") {
          const results = await database("modules_results")
            .select("module_definition_id")
            .avg("score as total_score")
            .groupBy("module_definition_id");

          const assignmentResultMap: Record<string, number> | null =
            results?.reduce((acc, row) => {
              if (row.module_definition_id && row.total_score !== undefined) {
                acc[row.module_definition_id] = row.total_score;
              }
              return acc;
            }, {} as Record<string, number>) || null;

          await fetchCompetencyData(CompetencyType.MODULE, modulesJunctionService, data.modules, assignmentResultMap);
        }

        if (!filterCompetencyType || filterCompetencyType === "exams") {
          await fetchCompetencyData(CompetencyType.EXAM, examsJunctionService, data.exams);
        }

        const CSVHeaders = [
          "Competency Type",
          "Competency Title",
          "Modality",
          "Total Test Takers",
          "Pass Count Overall",
          "Pass Rate Overall",
          "Pass Count Attempt 1",
          "Pass Rate Attempt 1",
          "Pass Count Attempt 2",
          "Pass Rate Attempt 2",
          "Aggregate Pass Percentage (1,2)",
          "Pass Count Attempt 3",
          "Pass Rate Attempt 3",
          "Aggregate Pass Percentage (1,2,3)",
          "Pass Count Attempt N",
          "Pass rate Attempt N",
          "Aggregate Pass Percentage (1,2,3,N)",
          "Never Passed",
          "Average Score",
        ];
        const csv = generateReportCSV2(
          [
            { data: data.modules, type: "Modules" },
            { data: data.exams, type: "Exams" },
          ],
          CSVHeaders,
        );

        await reportService.updateOne(uuid, { file_content: csv, status: ANCCReportStatus.COMPLETED });
        await updateReportStatus("completed", 100, `Report Generation Success`);
      })().catch(async (error) => {
        await reportService.updateOne(uuid, { status: ANCCReportStatus.FAILED });
        logger.error(`Error in background report generation: ${error}`);
      });
    } catch (error) {
      await reportService.updateOne(uuid, { status: ANCCReportStatus.FAILED });
      logger.error(`Initial error: ${error}`);
      return res.status(500).send({ status: 500, message: "Internal server error" });
    }
  });

  router.get("/agency-pass-rate", async (req: any, res: any) => {
    if (req.accountability.role !== UserRole.HSHAdmin) {
      return res.status(400).send({ status: 400, message: "Unauthorized" });
    }

    const db = new DBService(ItemsService, req.schema, { admin: true });
    const reportService = db.get("ancc_reports");
    const uuid = uuidv4();

    try {
      const { agency, type, startDate, endDate, title, modality, pageSize = 500 } = req.query;

      if (!agency || !type) {
        return res.status(400).send({ status: 400, message: "Bad request." });
      }

      res.status(202).send({ status: 202, message: "Report generation started", uuid });

      const generateReport = async () => {
        await reportService.createOne({
          id: uuid,
          file_content: "",
          created_at: new Date(),
          type: `${type}-agency-pass-rate`,
          status: ANCCReportStatus.GENERATING,
          created_by: req.accountability.user,
        });

        const examsService = db.get("exams");
        const modulesService = db.get("modules_definition");
        const examsJunctionService = db.get("junction_directus_users_exams");
        const modulesJunctionService = db.get("junction_modules_definition_directus_users");

        const data: { modules: Record<string, AgencyPassRateStats>; exams: Record<string, AgencyPassRateStats> } = {
          modules: {},
          exams: {},
        };

        const updateItemData = (
          itemStats: any,
          itemData: AgencyPassRateStats | undefined,
          agencyId: string,
          competencyType: string,
        ) => {
          if (!itemData) return;

          const isSameAgency = itemStats.agency === agencyId;

          const updateStatusCounts = (status: CompetencyState, isSameAgency: boolean) => {
            const isPassed = [CompetencyState.COMPLETED, CompetencyState.FINISHED].includes(status);
            const isFailed = [CompetencyState.FAILED_TIMED_OUT, CompetencyState.FAILED].includes(status);

            if (isPassed) {
              isSameAgency ? itemData.agencyPassed++ : itemData.otherAgencyPassed++;
            } else if (isFailed) {
              isSameAgency ? itemData.agencyFailed++ : itemData.otherAgencyFailed++;
            }
          };

          if (itemStats.score_history) {
            itemStats.score_history.forEach((record: any) => {
              updateStatusCounts(record.assignment_status, isSameAgency);
            });
          } else {
            updateStatusCounts(itemStats.status, isSameAgency);
          }

          itemData.modality = itemStats[competencyType]?.modality?.title || "Modality Not Found";
        };

        const fetchCompetencyData = async (
          itemsService: any,
          junctionService: any,
          targetData: Record<string, AgencyPassRateStats>,
          dataKey: string,
        ) => {
          let page = 0;
          while (true) {
            const items = await itemsService.readByQuery({
              fields: ["id", "title"],
              filter: {
                ...(title && { id: { _eq: title } }),
                ...(modality && { modality: { _eq: modality } }),
              },
              limit: pageSize,
              offset: page * pageSize,
            });

            if (!items.length) break;

            const fetchDetails = items.map(async (item: any) => {
              const filter = {
                [`${dataKey}_id`]: { _eq: item.id },
                status: {
                  _in: [
                    CompetencyState.COMPLETED,
                    CompetencyState.FINISHED,
                    CompetencyState.FAILED,
                    CompetencyState.FAILED_TIMED_OUT,
                  ],
                },
                ...(startDate &&
                  endDate && {
                    finished_on: { _between: [`${startDate}T00:00:00`, `${endDate}T23:59:59`] },
                  }),
              };

              const itemDetails = await fetchItemDetailsInConcurrentBatches(
                junctionService,
                filter,
                `${dataKey}_id`,
                500,
              );

              itemDetails.forEach((itemStats: any) => {
                const key = item.id;
                if (!targetData[key]) {
                  targetData[key] = {
                    itemTitle: itemStats[`${dataKey}_id`]?.title || "Unknown",
                    agencyPassed: 0,
                    agencyFailed: 0,
                    otherAgencyPassed: 0,
                    otherAgencyFailed: 0,
                    modality: "",
                  };
                }

                updateItemData(itemStats, targetData[key], agency, `${dataKey}_id`);
              });
            });

            await Promise.all(fetchDetails);
            page++;
          }
        };

        const fetchModulesAndExams = async () => {
          const tasks = [];
          if (!type || type === "modules") {
            tasks.push(fetchCompetencyData(modulesService, modulesJunctionService, data.modules, "modules_definition"));
          }
          if (!type || type === "exams") {
            tasks.push(fetchCompetencyData(examsService, examsJunctionService, data.exams, "exams"));
          }
          await Promise.all(tasks);
        };

        await fetchModulesAndExams();
        const CSVHeaders = [
          "Competency Type",
          "Competency Title",
          "Modality",
          "Percentage Pass for the Agency",
          "Overall Percentage Pass for All Agencies",
        ];

        const csv = await generateReportAgencyPassRateCSVText(
          [
            { data: data.modules, type: "Modules" },
            { data: data.exams, type: "Exams" },
          ],
          CSVHeaders,
        );

        await reportService.updateOne(uuid, {
          file_content: csv,
          status: ANCCReportStatus.COMPLETED,
        });
      };

      generateReport().catch(async (error) => {
        await reportService.updateOne(uuid, { status: ANCCReportStatus.FAILED });
        logger.error(`Error in background report generation: ${error}`);
      });
    } catch (error) {
      await reportService.updateOne(uuid, { status: ANCCReportStatus.FAILED });
      logger.error(`Initial error: ${error}`);
      return res.status(500).send({ status: 500, message: "Internal server error" });
    }
  });

  router.get("/ancc-reports", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.HSHAdmin) {
        return res.status(400).send({ status: 400, message: "Unauthorized" });
      }
      const db = new DBService(ItemsService, req.schema, { admin: true });
      const anccReportsService = db.get("ancc_reports");

      const reports = await anccReportsService.readByQuery({
        sort: ["-created_at"],
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 1,
        filter: {
          type: {
            _eq: req.query.type,
          },
        },
      });

      res.status(200).json({
        status: 200,
        data: reports,
      });
    } catch (error) {
      logger.error("Error fetching ancc_reports:", error);
      res.status(500).json({
        status: 500,
        message: "Internal server error",
      });
    }
  });

  router.get("/get-csv-report", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.HSHAdmin) {
        return res.status(400).send({ status: 400, message: "Unauthorized" });
      }
      if (!req.query.id) {
        return res.status(400).send({ status: 400, message: "Bad request" });
      }

      const db = new DBService(ItemsService, req.schema, { admin: true });
      const anccReportsService = db.get("ancc_reports");

      const reports = await anccReportsService.readByQuery({
        limit: 1,
        filter: {
          id: {
            _eq: req.query.id,
          },
        },
      });

      if (reports.length === 0) {
        return res.status(404).send({ status: 404, message: "Report not found" });
      }

      const gzip = createGzip();

      res.setHeader("Content-Type", "application/gzip");
      res.setHeader("Content-Disposition", `attachment; filename="${reports[0].type}.csv.gz"`);

      gzip.pipe(res);
      gzip.end(reports[0].file_content);
    } catch (error) {
      logger.error("Error fetching ancc_reports:", error);
      res.status(500).json({
        status: 500,
        message: "Internal server error",
      });
    }
  });

  router.get("/get-csv-report-data", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.HSHAdmin) {
        return res.status(400).send({ status: 400, message: "Unauthorized" });
      }
      if (!req.query.id) {
        return res.status(400).send({ status: 400, message: "Bad request" });
      }

      const db = new DBService(ItemsService, req.schema, { admin: true });
      const anccReportsService = db.get("ancc_reports");

      const reports = await anccReportsService.readByQuery({
        limit: 1,
        filter: {
          id: {
            _eq: req.query.id,
          },
        },
      });

      if (reports.length === 0) {
        return res.status(404).send({ status: 404, message: "Report not found" });
      }

      return res.status(200).json({
        data: reports,
      });
    } catch (error) {
      logger.error("Error fetching ancc_reports:", error);
      res.status(500).json({
        status: 500,
        message: "Internal server error",
      });
    }
  });

  router.get("/set-csv-report-downloaded", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.HSHAdmin) {
        return res.status(400).send({ status: 400, message: "Unauthorized" });
      }
      if (!req.query.id) {
        return res.status(400).send({ status: 400, message: "Bad request" });
      }
      const db = new DBService(ItemsService, req.schema, { admin: true });

      const anccReportsService = db.get("ancc_reports");

      await anccReportsService.updateOne(req.query.id, { status: ANCCReportStatus.DOWNLOADED });
      return res.status(200).json({
        status: 200,
        message: "Report marked as downloaded",
      });
    } catch (error) {
      logger.error("Error fetching ancc_reports:", error);
      res.status(500).json({
        status: 500,
        message: "Internal server error",
      });
    }
  });

  router.get("/generate-status", async (req: any, res: any) => {
    const reportId = req.query.id;

    if (!reportId) {
      return res.status(400).send(
        `data: ${JSON.stringify({
          status: "failed",
          progress: 0,
          message: "Report ID is required",
        })}\n\n`,
      );
    }

    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const reportService = new DBService(ItemsService, req.schema, { admin: true }).get("ancc_reports");

    const sendUpdate = (status: string, progress: number, message: string) => {
      res.write(`data: ${JSON.stringify({ status, progress, message })}\n\n`);
    };

    try {
      const report = await reportService.readByQuery({ filter: { id: { _eq: reportId } }, limit: 1 });

      if (!report.length) {
        sendUpdate("failed", 0, "Report not found");
        return res.end();
      }

      sendUpdate(report[0].status, report[0].progress || 0, `Report status: ${report[0].status}`);

      const interval = setInterval(async () => {
        try {
          const updatedReport = await reportService.readByQuery({ filter: { id: { _eq: reportId } }, limit: 1 });

          if (!updatedReport.length) {
            sendUpdate("failed", 0, "Report not found");
            clearInterval(interval);
            return res.end();
          }

          const status = updatedReport[0]?.status || "generating";
          const progress = updatedReport[0]?.progress || 0;

          sendUpdate(status, progress, `Report status: ${status}`);

          if (status === "completed" || status === "failed") {
            clearInterval(interval);
            res.end();
          }
        } catch (error) {
          logger.error(`Error in polling for report ID ${reportId}:`, error);
          clearInterval(interval);
          res.end();
        }
      }, 1000);
    } catch (error) {
      logger.error(`Error fetching report status for ID ${reportId}:`, error);
      sendUpdate("failed", 0, "An error occurred while fetching report status");
      res.end();
    }
  });

  const fetchCompetencyItems = async (type: string, req: any) => {
    const db = new DBService(ItemsService, req.schema, { admin: true });
    const modulesService = db.get("modules_definition");
    const examsService = db.get("exams");

    const filter = {
      ...(req.query.title && { id: { _eq: req.query.title } }),
      ...(req.query.modality && { modality: { _eq: req.query.modality } }),
    };

    const pageSize = req.query?.pageSize ?? -1;

    const [modules, exams] = await Promise.all([
      type !== "exams"
        ? modulesService.readByQuery({
            fields: ["id", "title"],
            filter,
            limit: pageSize,
          })
        : [],
      type !== "modules"
        ? examsService.readByQuery({
            fields: ["id", "title"],
            filter,
            limit: pageSize,
          })
        : [],
    ]);

    return { modules, exams };
  };

  const processReportInBackground = async (req: any, uuid: string, reportService: any) => {
    await reportService.createOne({
      id: uuid,
      file_content: "",
      created_at: new Date(),
      type: `${req.query.type}-agency-pass-rate`,
      status: ANCCReportStatus.GENERATING,
      created_by: req.accountability.user,
    });

    const db = new DBService(ItemsService, req.schema, { admin: true });
    const modulesJunctionService = db.get("junction_modules_definition_directus_users");
    const examsJunctionService = db.get("junction_directus_users_exams");

    const filterCompetencyType = req.query.type || null;
    const agencyId = req.query.agency;

    const data: { modules: Record<string, AgencyPassRateStats>; exams: Record<string, AgencyPassRateStats> } = {
      modules: {},
      exams: {},
    };

    const updateItemData = (
      itemStats: any,
      itemData: AgencyPassRateStats | undefined,
      agencyId: string | number,
      competencyTypeEquivalent: string,
    ) => {
      if (!itemData) return;

      const isSameAgency = itemStats.agency === agencyId;
      const scoreHistory = itemStats.score_history || [];

      scoreHistory.length > 0
        ? scoreHistory.forEach((record: any) => {
            if ([CompetencyState.COMPLETED, CompetencyState.FINISHED].includes(record.assignment_status)) {
              isSameAgency ? itemData.agencyPassed++ : itemData.otherAgencyPassed++;
            } else if ([CompetencyState.FAILED_TIMED_OUT, CompetencyState.FAILED].includes(record.assignment_status)) {
              isSameAgency ? itemData.agencyFailed++ : itemData.otherAgencyFailed++;
            }
          })
        : itemStats.approved
        ? isSameAgency
          ? itemData.agencyPassed++
          : itemData.otherAgencyPassed++
        : isSameAgency
        ? itemData.agencyFailed++
        : itemData.otherAgencyFailed++;

      itemData.modality = itemStats[competencyTypeEquivalent]?.modality?.title || "Modality Not Found";
    };

    const fetchCompetencyData = async (
      type: string,
      competencyItems: any[],
      junctionService: any,
      targetData: Record<string, AgencyPassRateStats>,
      agencyId: string,
    ) => {
      const batchSize = 1000;
      const concurrencyLimit = 10;

      const batches = chunk(competencyItems, batchSize);

      for (const batch of batches) {
        const batchPromises = batch.map(async (item) => {
          if (!item.id) return;

          const competencyTypeEquivalent = type === CompetencyType.MODULE ? "modules_definition_id" : "exams_id";

          const filter = {
            [competencyTypeEquivalent]: { _eq: item.id },
            status: {
              _in: [
                CompetencyState.COMPLETED,
                CompetencyState.FINISHED,
                CompetencyState.FAILED,
                CompetencyState.FAILED_TIMED_OUT,
              ],
            },
            ...(req.query.startDate &&
              req.query.endDate && {
                finished_on: { _between: [`${req.query.startDate}T00:00:00`, `${req.query.endDate}T23:59:59`] },
              }),
          };

          const itemDetails = await fetchItemDetailsInConcurrentBatches(
            junctionService,
            filter,
            competencyTypeEquivalent,
            batchSize,
            concurrencyLimit,
          );

          if (!itemDetails.length) return;

          itemDetails.forEach((itemStats: any) => {
            const itemKey = item.id;
            if (!targetData[itemKey]) {
              targetData[itemKey] = {
                itemTitle: itemStats[competencyTypeEquivalent]?.title || "Unknown",
                agencyPassed: 0,
                agencyFailed: 0,
                otherAgencyPassed: 0,
                otherAgencyFailed: 0,
                modality: "",
              };
            }
            updateItemData(itemStats, targetData[itemKey], agencyId, competencyTypeEquivalent);
          });
        });

        await Promise.all(batchPromises);
      }
    };

    const chunk = <T>(arr: T[], size: number): T[][] => {
      const result: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
      }
      return result;
    };

    const { modules, exams } = await fetchCompetencyItems(filterCompetencyType, req);

    if (modules.length > 0)
      await fetchCompetencyData("Module", modules, modulesJunctionService, data.modules, agencyId);
    if (exams.length > 0) await fetchCompetencyData("Exam", exams, examsJunctionService, data.exams, agencyId);

    const CSVHeaders = [
      "Competency Type",
      "Competency Title",
      "Modality",
      "Percentage Pass for the Agency",
      "Overall Percentage Pass for All Agencies",
    ];

    const csv = generateReportAgencyPassRateCSVV1(
      [
        { data: data.modules, type: "Modules" },
        { data: data.exams, type: "Exams" },
      ],
      CSVHeaders,
    );

    await reportService.updateOne(uuid, { file_content: csv, status: ANCCReportStatus.COMPLETED });
  };

  const generateReportAgencyPassRateCSVV1 = (
    dataSources: { data: Record<string, AgencyPassRateStats>; type: string }[],
    headers: string[],
  ): string => {
    const safeDivide = (numerator: number, denominator: number) =>
      denominator === 0 ? "0" : ((numerator / denominator) * 100).toFixed(2);

    const csvRows = dataSources.flatMap(({ data, type }) =>
      Object.values(data)
        .filter((item) => item.agencyPassed > 0 || item.agencyFailed > 0)
        .map((item: AgencyPassRateStats) =>
          [
            `"${type}"`,
            `"${item.itemTitle}"`,
            `"${item.modality}"`,
            `"${safeDivide(item.agencyPassed, item.agencyPassed + item.agencyFailed)}%"`,
            `"${safeDivide(item.otherAgencyPassed, item.otherAgencyPassed + item.otherAgencyFailed)}%"`,
          ].join(","),
        ),
    );

    return [headers.map((header) => `"${header}"`).join(","), ...csvRows].join("\n");
  };

  router.get("/agency-pass-rate-v1", async (req: any, res: any) => {
    if (req.accountability.role !== UserRole.HSHAdmin) {
      return res.status(400).send({ status: 400, message: "Unauthorized" });
    }

    const db = new DBService(ItemsService, req.schema, { admin: true });
    const reportService = db.get("ancc_reports");
    const uuid = uuidv4();

    try {
      if (!req.query.agency || !req.query.type) {
        return res.status(400).send({ status: 400, message: "Bad request." });
      }

      res.status(202).send({ status: 202, message: "Report generation started", uuid });
      jobQueue.push(uuid);

      processReportInBackground(req, uuid, reportService).catch((error) => {
        reportService.updateOne(uuid, { status: ANCCReportStatus.FAILED });
        logger.error(`Error in background report generation: ${error}`);
      });
    } catch (error) {
      await reportService.updateOne(uuid, { status: ANCCReportStatus.FAILED });
      logger.error(`Initial error: ${error}`);
      return res.status(500).send({ status: 500, message: "Internal server error" });
    }
  });

  router.get("/agency-pass-rate-v2", async (req: any, res: any) => {
    if (req.accountability.role !== UserRole.HSHAdmin) {
      return res.status(400).send({ status: 400, message: "Unauthorized" });
    }

    const db = new DBService(ItemsService, req.schema, { admin: true });
    const reportService = db.get("ancc_reports");
    const uuid = uuidv4();

    try {
      const { agency, type = null, startDate, endDate, title = null, modality = null, pageSize = 500 } = req.query;

      if (!agency || !type) {
        return res.status(400).send({ status: 400, message: "Bad request." });
      }

      res.status(202).send({ status: 202, message: "Report generation started", uuid });

      const generateReport = async () => {
        await reportService.createOne({
          id: uuid,
          file_content: "",
          created_at: new Date(),
          type: `${type}-agency-pass-rate`,
          status: ANCCReportStatus.GENERATING,
          created_by: req.accountability.user,
        });

        const examsJunctionService = db.get("junction_directus_users_exams");
        const modulesJunctionService = db.get("junction_modules_definition_directus_users");

        const calculateAgencyPassRate = async (
          junctionService: any,
          agencyId: string,
          dataKey: string,
          startDate: string,
          endDate: string,
          pageSize: number,
        ) => {
          let offset = 0;
          const compiledData: Record<string, AgencyPassRateStats> = {};
          const competencyKey = dataKey === "Exams" ? "exams" : "modules_definition";

          while (true) {
            const items = await junctionService.readByQuery({
              fields: [
                "status",
                `${competencyKey}_id.title`,
                `${competencyKey}_id.modality.title`,
                `${competencyKey}_id.id`,
                competencyKey === "exams" ? "score_history" : "approved",
                "agency",
              ],

              filter: {
                ...(startDate &&
                  endDate && {
                    finished_on: { _between: [`${startDate}T00:00:00`, `${endDate}T23:59:59`] },
                  }),
                ...(title && {
                  [`${competencyKey}_id`]: { id: { _eq: title } },
                }),
                ...(modality && {
                  [`${competencyKey}_id`]: { modality: { _eq: modality } },
                }),
                status: {
                  _in: [
                    CompetencyState.COMPLETED,
                    CompetencyState.FINISHED,
                    CompetencyState.FAILED,
                    CompetencyState.FAILED_TIMED_OUT,
                  ],
                },
              },
              limit: pageSize,
              offset,
            });

            if (!items.length) break;

            items.forEach((item: any) => {
              let title = item.exams_id?.title || item.modules_definition_id?.title || "Unknown Title";
              let modalityTitle =
                item.exams_id?.modality?.title || item.modules_definition_id?.modality?.title || "N/A";
              let id = item.exams_id?.id || item.modules_definition_id?.id;

              const itemKey = `${competencyKey}-${id}-${title}`;

              if (!compiledData[itemKey]) {
                compiledData[itemKey] = {
                  itemTitle: title,
                  modality: modalityTitle,
                  agencyPassed: 0,
                  agencyFailed: 0,
                  otherAgencyPassed: 0,
                  otherAgencyFailed: 0,
                };
              }

              const isSameAgency = item.agency === agencyId;

              let isPassed = false;
              if (competencyKey === "exams") {
                isPassed = [CompetencyState.COMPLETED, CompetencyState.FINISHED].includes(item.status);
              } else {
                isPassed = item.approved;
              }

              type ValidKeys = "agencyPassed" | "agencyFailed" | "otherAgencyPassed" | "otherAgencyFailed";

              const baseKey = isSameAgency ? "agency" : "otherAgency";
              const actionKey = isPassed ? "Passed" : "Failed";
              const key = `${baseKey}${actionKey}` as ValidKeys;

              const currentData = compiledData[itemKey];

              if (currentData) {
                if (currentData[key] === undefined) {
                  currentData[key] = 0;
                }
                currentData[key]++;
              }
            });

            offset += pageSize;
          }

          return { compiledData };
        };

        const fetchCompetencyData = async (
          junctionService: any,
          agencyId: string,
          startDate: string,
          endDate: string,
          pageSize: number,
          dataKey: string,
        ) => {
          const { compiledData } = await calculateAgencyPassRate(
            junctionService,
            agencyId,
            dataKey,
            startDate,
            endDate,
            pageSize,
          );

          return compiledData;
        };

        const fetchModulesAndExams = async () => {
          const modulesResult =
            !type || type === "modules"
              ? await fetchCompetencyData(modulesJunctionService, agency, startDate, endDate, pageSize, "Modules")
              : null;

          const examsResult =
            !type || type === "exams"
              ? await fetchCompetencyData(examsJunctionService, agency, startDate, endDate, pageSize, "Exams")
              : null;

          return {
            modules: modulesResult ?? null,
            exams: examsResult ?? null,
          };
        };

        const data = await fetchModulesAndExams();

        const CSVHeaders = [
          "Competency Type",
          "Competency Title",
          "Modality",
          "Percentage Pass for the Agency",
          "Overall Percentage Pass for All Agencies",
        ];

        const dataSources = [];
        if (data.modules) dataSources.push({ data: data.modules, type: "Modules" });
        if (data.exams) dataSources.push({ data: data.exams, type: "Exams" });

        const csv = await generateReportAgencyPassRateCSVText(dataSources, CSVHeaders);

        await reportService.updateOne(uuid, {
          file_content: csv,
          status: ANCCReportStatus.COMPLETED,
        });
      };

      generateReport().catch(async (error) => {
        console.error(error instanceof Error ? error.message : error);
        await reportService.updateOne(uuid, { status: ANCCReportStatus.FAILED });
        logger.error(`Error in background report generation: ${error}`);
      });
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      await reportService.updateOne(uuid, { status: ANCCReportStatus.FAILED });
      logger.error(`Initial error: ${error}`);
      return res.status(500).send({ status: 500, message: "Internal server error" });
    }
  });

  router.get("/exam-average-time-spent", async (req: any, res: any) => {
    if (req.accountability.role !== UserRole.HSHAdmin) {
      return res.status(400).send({ status: 400, message: "Unauthorized" });
    }

    try {
      const result = await database("exams as e")
        .select(
          "e.title",
          "e.id",
          database.raw("CAST(SUM(er.time_taken) AS DECIMAL) AS total_time"),
          database.raw("COUNT(DISTINCT CONCAT(er.assignment_id, '-', er.attempt)) AS total_attempts"),
          database.raw(
            "CAST(SUM(er.time_taken) AS FLOAT) / NULLIF(COUNT(DISTINCT CONCAT(er.assignment_id, '-', er.attempt)), 0) AS average_time", // Convert average time from seconds to minutes
          ),
        )
        .join("exam_results as er", "e.id", "=", "er.exams_id")
        .groupBy("e.title", "e.id");

      return res.status(200).send({ status: 200, data: result });
    } catch (error) {
      logger.error(`Initial error: ${error}`);
      return res.status(500).send({ status: 500, message: "Internal server error" });
    }
  });
});
