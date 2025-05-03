export const QuestionDetailsCard = ({
  title,
  content,
}: {
  title: string;
  content: string;
}) => (
  <div className="flex w-full flex-col gap-4 rounded-lg bg-blue-50 p-11">
    <span className="text-lg font-bold text-blue-800">{title}</span>
    <p className="text-lg leading-none text-gray-500">{content}</p>
  </div>
);
