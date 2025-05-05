import { CompetencyState, CompetencyType, DirectusStatus } from "types";

import { DBService } from "../../common/services";

const processUpdates = async (
  service: any,
  comptencyType: CompetencyType,
  idField: string,
  filterExtension: any = {},
  logger: any,
) => {
  try {
    const generalFilter = {
      _and: [
        { due_date: { _lte: "$NOW" } },
        {
          status: {
            _nin: [
              CompetencyState.EXPIRED,
              CompetencyState.DUE_DATE_EXPIRED,
              DirectusStatus.ARCHIVED,
              CompetencyState.COMPLETED,
              CompetencyState.FINISHED,
              CompetencyState.FAILED,
            ],
          },
        },
      ],
    };

    const filter = filterExtension
      ? { ...generalFilter, _and: [...generalFilter._and, filterExtension] }
      : generalFilter;

    const items = await service.readByQuery({
      fields: ["id", idField],
      filter,
      limit: 100,
      sort: ["-due_date"],
    });

    if (!items.length) {
      logger.info(`No ${comptencyType} items found for due date expired`);
      return;
    }

    for (const item of items) {
      if (item[idField] === null) {
        continue;
      }
      try {
        await service.updateOne(item.id, {
          status: CompetencyState.DUE_DATE_EXPIRED,
        });
      } catch (updateError) {
        logger.error("Error updating due date expired:", updateError);
      }
    }
    logger.info(`Updated due date expired of ${comptencyType} for ${items.length} items`);
  } catch (error) {
    logger.error("Error processing due date expired:", error);
  }
};

export const handleCompetencyDueDate = async (db: DBService, logger: any) => {
  const services = [
    {
      service: db.get("junction_directus_users_exams"),
      competencyType: CompetencyType.EXAM,
      idField: "exams_id",
    },
    {
      service: db.get("junction_sc_definitions_directus_users"),
      competencyType: CompetencyType.SKILL_CHECKLIST,
      idField: "sc_definitions_id",
    },
    {
      service: db.get("junction_modules_definition_directus_users"),
      competencyType: CompetencyType.MODULE,
      idField: "modules_definition_id",
    },
    {
      service: db.get("junction_directus_users_documents"),
      competencyType: CompetencyType.DOCUMENT,
      idField: "documents_id",
      filterExtension: { read: { _null: true } },
    },
    {
      service: db.get("junction_directus_users_policies"),
      competencyType: CompetencyType.POLICY,
      idField: "policies_id.id",
      filterExtension: { signed_on: { _null: true } },
    },
  ];
  for (const { service, competencyType, idField, filterExtension } of services) {
    await processUpdates(service, competencyType, idField, filterExtension, logger);
  }
};
