import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const rewriteRule = (
  request: NextRequest,
  replacePath: string
): NextResponse<unknown> => {
  // This logic is only applied to /cms
  if (!process.env.CMS_HOST) throw new Error("Missing CMS_HOST env var");

  const newUrl = new URL(request.url);
  const originalUrl = request.url;
  newUrl.host = process.env.CMS_HOST;
  newUrl.port = process.env.CMS_PORT || "";
  newUrl.protocol = "http";
  newUrl.pathname = newUrl.pathname.replace(replacePath, "");
  const response = NextResponse.rewrite(newUrl);
  response.headers.set("x-original-url", originalUrl);
  return response;
};

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.includes("/api/v1")) {
    return rewriteRule(request, "/api/v1");
  }

  if (request.nextUrl.pathname.includes("/api/v2")) {
    return rewriteRule(request, "/api");
  }

  if (request.nextUrl.pathname.startsWith("/cms")) {
    return rewriteRule(request, "/cms");
  }
}
