import { ExpirationType } from "types";
interface Props {
  expiration: ExpirationType;
}

export const Frequency: React.FC<Props> = ({ expiration }) => {
  const color = expiration === ExpirationType.ONE_TIME ? "gray" : "yellow";
  return (
    <div
      className={`rounded-md bg-${color}-100 text-xs font-medium text-${color}-700 p-2 uppercase`}
    >
      {expiration ? expiration : ExpirationType.ONE_TIME}
    </div>
  );
};
