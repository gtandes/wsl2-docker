const path = require("path");
const fse = require("fs-extra");
const fs = require("fs");

module.exports = ({ init }, { services, getSchema, database, logger }) => {
  const { ImportService, ExportService, ItemsService, FilesService } = services;
  const collections = [
    {
      name: "directus_dashboards",
      fields: ["id", "name", "icon", "note", "color"],
    },
    {
      name: "directus_panels",
      fields: [
        "id",
        "dashboard",
        "name",
        "icon",
        "color",
        "show_header",
        "note",
        "type",
        "position_x",
        "position_y",
        "width",
        "height",
        "options",
      ],
    },
    {
      name: "directus_flows",
      fields: [
        "id",
        "name",
        "icon",
        "color",
        "description",
        "status",
        "trigger",
        "accountability",
        "options",
        "operation",
      ],
      overwrite_fields: {},
    },
    {
      name: "directus_operations",
      fields: ["id", "name", "key", "type", "position_x", "position_y", "options", "resolve", "reject", "flow"],
      overwrite_fields: {
        resolve: null,
        reject: null,
      },
    },
  ];

  async function importAction({ collection, overwrite = false }) {
    console.log(`Restoring collection: ${collection.name} ${overwrite && "(pre-work)"}`);
    const schema = await getSchema();
    const src = path.resolve(process.cwd(), "seed", `${collection.name}.json`);
    let tmpFileReadStream;
    const dst = path.resolve(process.cwd(), "seed", `${collection.name}_overwritten.json`);
    if (overwrite) {
      const file = fs.readFileSync(src, "utf8");
      const data = JSON.parse(file);
      const newData = data.map((item) => {
        return { ...item, ...collection.overwrite_fields };
      });
      fs.writeFileSync(dst, JSON.stringify(newData, null, 2));
      tmpFileReadStream = fse.createReadStream(dst);
    } else {
      tmpFileReadStream = fse.createReadStream(src);
    }
    const importService = new ImportService({ schema, knex: database });
    await importService.importJSON(collection.name, tmpFileReadStream);

    if (overwrite) {
      fs.unlinkSync(dst);
    }

    console.log("✅ Finished restore");
  }

  async function exportAction({ collection }) {
    console.log("Exporting data from:", collection.name);

    const schema = await getSchema();
    const filesItemsService = new ItemsService("directus_files", {
      schema,
    });
    const filesService = new FilesService({ schema });

    const uniqueFileName = `${collection.name}-${Date.now()}`;

    const exportService = new ExportService({ schema, knex: database });
    await exportService.exportToFile(
      collection.name,
      {
        fields: collection.fields,
        sort: ["id"],
      },
      "json",
      {
        file: {
          title: uniqueFileName,
        },
      },
    );

    const [newFile] = await filesItemsService.readByQuery({
      filter: {
        title: { _eq: uniqueFileName },
      },
      limit: 1,
    });

    const newFilePath = path.resolve(process.cwd(), "uploads", newFile.filename_disk);

    const destinationPath = path.resolve(process.cwd(), "seed", `${collection.name}.json`);

    fs.copyFileSync(newFilePath, destinationPath);
    await filesService.deleteOne(newFile.id);

    console.log("✅ Finished");
  }

  init("cli.after", ({ program }) => {
    program.command("data:export").action(async () => {
      console.log("Running data export...");
      try {
        for (const collection of collections) {
          await exportAction({ collection });
        }
        process.exit(0);
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    });
  });

  init("cli.after", ({ program }) => {
    program.command("data:import").action(async () => {
      console.log("Running data import...");
      try {
        const colletionsWithOverwriteFields = collections.filter((c) => c.overwrite_fields);
        for (const collection of colletionsWithOverwriteFields) {
          await importAction({ collection, overwrite: true });
        }
        for (const collection of collections) {
          await importAction({ collection });
        }
        process.exit(0);
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    });
  });
};
