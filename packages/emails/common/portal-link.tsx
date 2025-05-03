import { Button } from "@react-email/components";
import * as React from "react";

export const PortalLink: React.FC = () => {
  const baseUrl = process.env["WEB_URL"];

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "32px", marginBottom: "32px" }}>
      <Button
        pX={50}
        pY={12}
        style={{
          backgroundColor: "#007BFF",
          color: "#ffffff",
          borderRadius: "5px",
          textDecoration: "none",
          textAlign: "center",
          display: "inline-block",
        }}
        href={baseUrl}
      >
        Go to Portal
      </Button>
    </div>
  );
};
