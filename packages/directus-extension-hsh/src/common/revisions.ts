async function getLastRevisions(revisionsService: any, collectionName: string, itemId: string) {
  const lastRevision = await revisionsService.readByQuery({
    fields: ["data"],
    filter: {
      collection: { _eq: collectionName },
      item: { _eq: itemId },
    },
    sort: ["-id"],
    limit: 2,
  });
  const currentRevision = lastRevision.at(0)?.data;
  const previousRevision = lastRevision.at(1)?.data;

  if (!currentRevision) {
    throw new Error(`No current revision found for ${collectionName} ${itemId}`);
  }

  if (!previousRevision) {
    throw new Error(
      `No previous revision found for ${collectionName} ${itemId}. Item was probably imported from the old platform and no new versions were created.`,
    );
  }

  https: return {
    currentRevision,
    previousRevision,
  };
}

function hasChanged(
  data: {
    [key: string]: any;
  },
  delta: {
    [key: string]: any;
  },
  fields: string[],
) {
  return fields.some((field) => data[field] !== delta[field]);
}

export async function entityHasChanged(
  revisionsService: any,
  collectionName: string,
  itemId: string,
  fields: string[],
) {
  const { currentRevision, previousRevision } = await getLastRevisions(revisionsService, collectionName, itemId);

  const _hasChanged = hasChanged(currentRevision, previousRevision, fields);

  return {
    hasChanged: _hasChanged,
    currentRevision,
    previousRevision,
  };
}

export async function entityChangedWithPattern(
  revisionsService: any,
  collectionName: string,
  itemId: string,
  pattern: {
    [key: string]: (v: any) => boolean;
  },
) {
  const fields = Object.keys(pattern);

  const { hasChanged, currentRevision } = await entityHasChanged(revisionsService, collectionName, itemId, fields);

  if (!hasChanged) return false;

  // validate that every key in the pattern matches the currentRevision
  const patternKeys = Object.keys(pattern);
  const patternMatches = patternKeys.every((key) => {
    const patternFn = pattern[key];
    if (!patternFn) return true;
    return patternFn(currentRevision[key]);
  });

  return patternMatches;
}

export async function columnChanged(
  revisionsService: any,
  collectionName: string,
  itemId: string,
  column: string,
): Promise<boolean> {
  const { hasChanged } = await entityHasChanged(revisionsService, collectionName, itemId, [column]);

  return hasChanged;
}
