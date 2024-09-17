import * as sv from "@olehermanse/utils/schema.js";

const web_socket_actions = [
  "",
  "chat",
  "lobby",
  "replace_game",
  "update_game",
  "game_move",
  "username",
] as const;
export type WebSocketAction = (typeof web_socket_actions)[number];

export class WebSocketMessage implements sv.SchemaClass {
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

  pretty(): string {
    const payload = JSON.stringify(JSON.parse(this.payload), undefined, 2);
    return `action: "${this.action}", lobby_id: "${this.lobby_id}", game_id: "${this.game_id}", payload: \n${payload}`;
  }

  class_name(): string {
    return "WebSocketMessage";
  }

  schema(): sv.Schema {
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
    if (this.onmessage === null) {
      console.log("No handler defined");
      return;
    }
    const message = sv.to_class(m.data, new WebSocketMessage());
    if (message instanceof Error) {
      console.log("Error, invalid web socket message received");
      return;
    }
    console.log("<- Received: " + message.pretty());
    this.onmessage(message);
  }

  attempt_send() {
    if (this.queue.length === 0) {
      return;
    }
    if (this.ws.readyState === 1) {
      const data = <string>this.queue.shift();
      this.ws.send(data);
      this.attempt_send();
      return;
    }
    setTimeout(() => {
      this.attempt_send();
    }, 100);
  }

  send(msg: WebSocketMessage) {
    this.queue.push(sv.to_string(msg, true));
    this.attempt_send();
    console.log("-> Sent: " + msg.pretty());
  }
}
