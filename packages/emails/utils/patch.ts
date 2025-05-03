import path from "path";
import fs from "fs";

function main() {
  const configPath = path.resolve(process.cwd(), ".react-email/next.config.js");
  if (fs.existsSync(configPath)) {
    // read file content
    const content = fs.readFileSync(configPath, "utf-8");
    const patch = `serverComponentsExternalPackages: ['@react-email/components','@react-email/render','@react-email/tailwind'],`;

    // check that file doesn't contain patch
    if (content.includes(patch)) {
      return null;
    }

    // append patch after the string "appDir: true,"
    const patchedContent = content.replace("appDir: true,", `appDir: true,\n    ${patch}`);

    // write patched content to file
    fs.writeFileSync(configPath, patchedContent, "utf-8");
  }
}

main();
