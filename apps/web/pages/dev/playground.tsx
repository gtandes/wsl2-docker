const playgroundSections = {
  text: {
    variants: [
      "text-xs",
      "text-sm",
      "text-base",
      "text-lg",
      "text-xl",
      "text-2xl",
      "text-3xl",
      "text-4xl",
      "text-5xl",
      "text-6xl",
      "text-7xl",
      "text-8xl",
      "text-9xl",
    ],
  },
  colors: {
    variants: {
      gray: [
        "bg-gray-50",
        "bg-gray-100",
        "bg-gray-200",
        "bg-gray-300",
        "bg-gray-400",
        "bg-gray-500",
        "bg-gray-600",
        "bg-gray-700",
        "bg-gray-800",
        "bg-gray-900",
      ],
      red: [
        "bg-red-50",
        "bg-red-100",
        "bg-red-200",
        "bg-red-300",
        "bg-red-400",
        "bg-red-500",
        "bg-red-600",
        "bg-red-700",
        "bg-red-800",
        "bg-red-900",
      ],
      yellow: [
        "bg-yellow-50",
        "bg-yellow-100",
        "bg-yellow-200",
        "bg-yellow-300",
        "bg-yellow-400",
        "bg-yellow-500",
        "bg-yellow-600",
        "bg-yellow-700",
        "bg-yellow-800",
        "bg-yellow-900",
      ],
      green: [
        "bg-green-50",
        "bg-green-100",
        "bg-green-200",
        "bg-green-300",
        "bg-green-400",
        "bg-green-500",
        "bg-green-600",
        "bg-green-700",
        "bg-green-800",
        "bg-green-900",
      ],
      teal: [
        "bg-teal-50",
        "bg-teal-100",
        "bg-teal-200",
        "bg-teal-300",
        "bg-teal-400",
        "bg-teal-500",
        "bg-teal-600",
        "bg-teal-700",
        "bg-teal-800",
        "bg-teal-900",
      ],
      "dark-blue": [
        "bg-dark-blue-50",
        "bg-dark-blue-100",
        "bg-dark-blue-200",
        "bg-dark-blue-300",
        "bg-dark-blue-400",
        "bg-dark-blue-500",
        "bg-dark-blue-600",
        "bg-dark-blue-700",
        "bg-dark-blue-800",
        "bg-dark-blue-900",
      ],
      blue: [
        "bg-blue-50",
        "bg-blue-100",
        "bg-blue-200",
        "bg-blue-300",
        "bg-blue-400",
        "bg-blue-500",
        "bg-blue-600",
        "bg-blue-700",
        "bg-blue-800",
        "bg-blue-900",
      ],
    },
  },
};

function Playground() {
  return (
    <div className="container">
      <div className="mb-32">
        <h2 className="mb-8 text-3xl font-bold">Text sizes</h2>
        {playgroundSections.text.variants.map((variant) => (
          <p key={variant} className={variant}>
            {variant}
          </p>
        ))}
      </div>

      <div className="mb-32">
        <h2 className="mb-8 text-3xl font-bold">Colors</h2>
        <div className="flex gap-2">
          {Object.entries(playgroundSections.colors.variants).map(
            ([variant, colors]) => (
              <div key={variant} className="flex flex-col items-center">
                <h3>{variant}</h3>
                <div className="flex flex-col overflow-hidden rounded-lg">
                  {colors.map((className) => (
                    <div
                      key={className}
                      className={`h-10 w-20 ${className}`}
                    ></div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default Playground;
