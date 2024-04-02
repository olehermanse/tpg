import { Schema, SchemaClass } from "./schema.ts";

const web_socket_actions = ["", "chat", "login"] as const;
export type WebSocketAction = (typeof web_socket_actions)[number];

export class WebSocketMessage implements SchemaClass {
  action: WebSocketAction;
  lobby_id: string;
  game_id: string;
  payload: string;

  constructor(
    action: WebSocketAction = "",
    lobby_id = "",
    game_id = "",
    payload = "",
  ) {
    this.action = action;
    this.lobby_id = lobby_id;
    this.game_id = game_id;
    this.payload = payload;
  }

  class_name(): string {
    return "WebSocketMessage";
  }

  schema(): Schema {
    return {
      properties: {
        action: { type: "string" },
        lobby_id: { type: "string" },
        game_id: { type: "string" },
        payload: { type: "string" },
      },
    };
  }
}
