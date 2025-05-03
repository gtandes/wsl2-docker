export const skillChecklistGeneralAverages = (
  questions: Array<any>,
): {
  skillAverage: number;
  frequencyAverage: number;
  overallAvg: number;
} => {
  const result = {
    skillAverage: 0,
    frequencyAverage: 0,
    overallAvg: 0,
  };

  if (!questions) return result;

  let totalSkillItems = 0;
  let totalFreqItems = 0;
  let skillAcc = 0;
  let freqAcc = 0;

  for (const question of questions) {
    for (const section of question.sections) {
      const items = section.items;
      totalSkillItems += items.filter((i: any) => i.skill !== 0).length;
      totalFreqItems += items.filter((i: any) => i.frequency !== 0).length;

      for (const item of items) {
        freqAcc += item.frequency;
        skillAcc += item.skill;
      }
    }
  }

  result.frequencyAverage = freqAcc / totalFreqItems;
  result.skillAverage = skillAcc / totalSkillItems;

  if (result.skillAverage === 0) {
    result.overallAvg = result.frequencyAverage;
  } else if (result.frequencyAverage === 0) {
    result.overallAvg = result.skillAverage;
  } else {
    result.overallAvg = (skillAcc + freqAcc) / (totalSkillItems + totalFreqItems);
  }

  return result;
};
