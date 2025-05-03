import React, { useContext } from "react";
import { ExamResultsContext } from "../../shared/exams/ExamResults";

export const CategoriesBreakdown = () => {
  const { categoriesCount } = useContext(ExamResultsContext);
  return (
    !!categoriesCount &&
    categoriesCount.length > 0 && (
      <div className="bg-white">
        <h6 className="font-semibold">Correct Answers by Questions Category</h6>
        <div className="m-auto w-full overflow-x-auto py-10  print:w-10/12 md:w-10/12">
          <table className="w-full overflow-x-auto">
            <thead>
              <tr>
                <th className="dark:border-slate-600 border-b p-4 pb-3 pl-8 pt-0 text-left font-medium">
                  Category
                </th>
                <th className="dark:border-slate-600 border-b p-4 pb-3 pl-8 pt-0 text-left font-medium">
                  Answers
                </th>
                <th className="dark:border-slate-600 border-b p-4 pb-3 pl-8 pt-0 text-left font-medium">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {categoriesCount.map((category, i) => {
                const percentage = Math.floor(
                  (category.correctAnswers * 100) / category.totalAnswers
                ).toString();

                return (
                  <tr className="text-gray-500" key={`category-${i}`}>
                    <td className="border-slate-100 w-[400px] border-b p-2 md:p-4 md:py-2 md:pl-8">
                      {category.title}
                    </td>
                    <td className="border-slate-100  border-b p-2 text-center align-middle text-sm text-gray-900 md:p-4 md:py-2 md:pl-8">
                      <span>
                        {category.correctAnswers}/{category.totalAnswers}
                      </span>
                      <div className="percentage-bar-bg mb-4 mt-2 block h-2 rounded-full bg-gray-200">
                        <div
                          className={`percentage-bar h-2 rounded-full ${
                            percentage ? "bg-green-600" : "bg-gray-200"
                          }`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        ></div>
                      </div>
                    </td>
                    <td className="border-slate-100 border-b p-4 py-2 pl-8">
                      {percentage || "0"}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  );
};
