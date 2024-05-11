import { Schema } from "@olehermanse/utils/schema.js";
import { Fives } from "./fives.ts";

export class Twelves extends Fives {
  constructor() {
    super(12, 6);
  }

  class_name(): string {
    return "Twelves";
  }
  schema(): Schema {
    const schema = super.schema();
    delete schema.properties["n"];
    delete schema.properties["to_win"];
    return schema;
  }
}
