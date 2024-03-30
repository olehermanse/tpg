import { Schema } from "../libcommon/schema.ts";
import { Fives } from "./fives.ts";

export class TicTacToe extends Fives {
  constructor() {
    super(3, 3);
  }

  class_name(): string {
    return "TicTacToe";
  }
  schema(): Schema {
    const schema = super.schema();
    delete schema.properties["n"];
    delete schema.properties["to_win"];
    return schema;
  }
}
