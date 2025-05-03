export const BullhornGuide: React.FC = () => {
  return (
    <div>
      <p>
        <strong>Link HSH with Bullhorn</strong>
      </p>
      <div className="mt-3">
        To seamlessly integrate HSH with Bullhorn, carefully follow these steps:
      </div>
      <ol className="text-md mt-2 list-decimal pl-4 ">
        <li>
          <strong>Copy the URL</strong> from the Custom Tab Section.
        </li>
        <li>
          <strong>Login to Bullhorn</strong> and open the <strong>Menu</strong>{" "}
          bar on the left side of the screen.
        </li>
        <li>
          Select <strong>Admin</strong>.
        </li>
        <li>
          Select <strong>View Layout</strong>.
        </li>
        <li>
          From the <strong>Field Map Entity</strong> dropdown, choose Candidate.
        </li>
        <li>
          Go to <strong>Custom Tabs</strong>.
        </li>
        <li>
          Fill in the following details: <strong>Name, URL,</strong> and{" "}
          <strong>User Types</strong>.
        </li>
        <li>
          Once completed, click <strong>Save</strong>.
        </li>
      </ol>
    </div>
  );
};
