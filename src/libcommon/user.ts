import { Schema, SchemaClass } from "./schema.ts";

export class User implements SchemaClass {
  userid: string;
  username: string;

  class_name(): string {
    return "User";
  }
  schema(): Schema {
    return {
      properties: {
        userid: { type: "string" },
        username: { type: "string" },
      },
    };
  }

  constructor(userid?: string, username?: string) {
    this.userid = userid ?? "";
    this.username = username ?? "";
  }
}
