import { EmailAction } from "types";
import { CloseModalHandler } from "../../hooks/useModal";
import Button from "../Button";
import { Directus_Users } from "api";
import { useState } from "react";
import { query } from "../../utils/utils";
import { GENERIC_ERROR, notify } from "../Notification";

interface Props {
  onClose: CloseModalHandler;
  users: Directus_Users[];
  agency: string;
  disable?: {
    [key in EmailAction]?: boolean;
  };
  hidden?: {
    [key in EmailAction]?: boolean;
  };
}

export const EmailActionsModal: React.FC<Props> = ({
  onClose,
  users,
  agency,
  hidden = {},
}) => {
  const [selectedActions, setSelectedActions] = useState<EmailAction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const selectAction = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as EmailAction;
    let actions = [...selectedActions, value];

    if (selectedActions.includes(value)) {
      actions = actions.filter((c) => c !== value);
    }
    setSelectedActions(actions);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const response = await query("/cms/user/email-notifications", "POST", {
      users: users.map((user) => ({ id: user.id, email: user.email })),
      actions: selectedActions,
      agency,
    });

    setLoading(false);
    if (response.status !== 200) {
      notify(GENERIC_ERROR);
      return;
    }

    notify({
      title: "Success!",
      description: "Email Notifications Sent!",
      type: "success",
    });
    onClose();
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="m-auto mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {Object.values(EmailAction).map(
          (action) =>
            !hidden[action] && (
              <label
                className={`flex items-center gap-2 ${
                  hidden[action] ? "cursor-not-allowed text-gray-500" : ""
                }`}
                key={action}
              >
                <input
                  type="checkbox"
                  value={action}
                  className={`text-indigo-600 focus:ring-indigo-600 h-4 w-4 rounded border-gray-300 ${
                    hidden[action] ? "border-gray-400 bg-gray-200" : ""
                  }`}
                  checked={selectedActions.includes(action)}
                  onChange={selectAction}
                  disabled={hidden[action]}
                />
                {action}
              </label>
            )
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          onClick={onClose}
          variant="outline"
          label="Cancel"
        />
        <Button
          type="button"
          onClick={handleSubmit}
          label="Send"
          disabled={selectedActions.length === 0}
          loading={loading}
        />
      </div>
    </div>
  );
};
