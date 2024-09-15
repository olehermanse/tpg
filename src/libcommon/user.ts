import { Schema, SchemaClass } from "@olehermanse/utils/schema.js";

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

export class AuthObject implements SchemaClass {
  userid: string;
  username: string;
  lobby_id: string;

  class_name(): string {
    return "AuthObject";
  }
  schema(): Schema {
    return {
      properties: {
        userid: { type: "string" },
        username: { type: "string" },
        lobby_id: { type: "string" },
      },
    };
  }

constructor(userid?: string, username?: string, lobby_id?: string) {
    this.userid = userid ?? "";
    this.username = username ?? "";
    this.lobby_id = lobby_id ?? "";
  }
}
