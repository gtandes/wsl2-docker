export const Spinner: React.FC<{
  loading?: boolean;
  className?: string;
}> = ({ loading = true, className = "" }) => {
  return loading ? (
    <div
      className={`animate-spin rounded-full  border-gray-300 border-t-gray-100 ${
        className ? className : "h-6 w-6 border-2"
      }`}
      style={{
        animationDuration: "400ms",
      }}
    ></div>
  ) : (
    <div className={className ? className : "h-6 w-6"}></div>
  );
};
