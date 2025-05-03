import { generateEmailPayload, getTemplate } from "./get-email-template";

const a = generateEmailPayload("clinician-assignment", "juan@germinateapps.com", "You received a new assignment", {
  emailData: {
    assignmentId: "123",
    envUrl: "https://envUrl.com",
    name: "John Doe",
  },
});

console.log({ a });
