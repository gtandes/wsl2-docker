export class DBService {
  service;
  schema;
  accountability;
  private trx: any;

  constructor(service: any, schema: any, accountability: any) {
    this.service = service;
    this.schema = schema;
    this.accountability = accountability;
    this.trx = null;
  }

  setTransaction(trx: any) {
    this.trx = trx;
    return this;
  }

  get(collection: string) {
    const service = new this.service(collection, {
      schema: this.schema,
      accountability: this.accountability,
      ...(this.trx ? { knex: this.trx } : {}),
    });
    return service;
  }
}
