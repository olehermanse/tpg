import { Schema, SchemaClass, to_class, to_string } from "./schema.ts";

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

export class WebSocketWrapper {
  ws: WebSocket;
  queue: string[];
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((msg: WebSocketMessage) => void) | null;
  constructor(
    ws: WebSocket,
    onopen?: () => void,
    onclose?: () => void,
    onmessage?: (msg: WebSocketMessage) => void,
  ) {
    this.onopen = onopen ?? null;
    this.onclose = onclose ?? null;
    this.onmessage = onmessage ?? null;
    this.ws = ws;
    this.ws.onopen = () => this.on_open();
    this.ws.onmessage = (m) => this.on_message(m);
    this.ws.onclose = () => this.on_open();
    this.queue = [];
  }

  on_open() {
    if (this.onopen === null) {
      return;
    }
    this.onopen();
  }

  on_close() {
    if (this.onclose === null) {
      return;
    }
    this.onclose();
  }

  on_message(m: MessageEvent) {
    console.log("<- Received: " + m.data);
    if (this.onmessage === null) {
      return;
    }
    const message = to_class(m.data, new WebSocketMessage());
    if (message instanceof Error) {
      console.log("Error, invalid web socket message received");
      return;
    }
    this.onmessage(message);
  }

  attempt_send() {
    if (this.queue.length === 0) {
      return;
    }
    if (this.ws.readyState === 1) {
      const data = <string> this.queue.shift();
      this.ws.send(data);
      console.log("-> Sent: " + data);
      this.attempt_send();
      return;
    }
    setTimeout(() => {
      this.attempt_send();
    }, 100);
  }

  send(msg: WebSocketMessage) {
    this.queue.push(to_string(msg));
    this.attempt_send();
  }
}
