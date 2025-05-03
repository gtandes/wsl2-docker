console.log("Waiting for PG to start\n");
import { Client } from "pg";

const MAX_ATTEMPTS = 20;

async function main(iteration = 1) {
  const client = new Client({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "postgres",
  });

  try {
    console.log(`Connection attempt #${iteration}`);
    await client.connect();
    console.log("✅");
    await client.end();
    process.exit(0);
  } catch (error: any) {
    if (error.code !== "28P01") {
      const waitTime = 1000 * iteration;
      console.log("Failed");

      if (iteration >= MAX_ATTEMPTS) {
        console.log("❌ Giving up");
        process.exit(1);
      }

      setTimeout(() => {
        main(iteration + 1);
      }, waitTime);
    } else {
      console.log("✅");
      process.exit(0);
    }
  } finally {
    console.log("");
  }
}

main();
