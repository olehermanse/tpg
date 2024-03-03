import type { XY, CR, FillStroke } from "./interfaces";

export function xy(x: number, y: number): XY {
  return { x: x, y: y };
}

export function position(c: number, r: number): CR {
  return { c: c, r: r };
}

export function fill_stroke(f: string, s: string): FillStroke {
  return { fill: f, stroke: s };
}

export function seconds(ms: number): number {
  return ms / 1000;
}

export function dps(dps: number, ms: number): number {
  return dps * seconds(ms);
}

export function number_string(n: number | string): string {
  const num = Number(n);
  if (num < 0) {
    return "-" + number_string(-1 * num);
  }
  const s = "" + num;
  if (s.includes("e") || s.length <= 3) {
    return s;
  }

  let result = "";
  let length = 0;
  for (let c of s.split("").reverse()) {
    result += c;
    length += 1;
    if (length % 3 === 0) {
      result += " ";
    }
  }
  return result.split("").reverse().join("").trim();
}

export function distance(a: CR, b: CR): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.c - b.c) ** 2);
}

export function limit(min: number, x: number, max: number): number {
  if (x < min) {
    return min;
  }
  if (x > max) {
    return max;
  }
  return x;
}

export function get_rotation(a: CR, b: CR): number {
  const rot = Math.atan2(a.r - b.r, b.c - a.c);
  if (rot > 0.0) {
    return rot;
  }
  return rot + 2 * Math.PI;
}

// min and max are both inclusive
// (use max = length - 1 with arrays)
export function randint(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function shuffle(array: any[]): any[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randint(0, i);
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

export class TextWrapper {
  original: string;
  remaining: string;
  word: string;
  words: string[];
  lines: string[];
  line_length: number;
  fragment_length: number;

  constructor(text: string, line_length: number) {
    this.original = text;
    this.remaining = text.trim().replace("  ", " ");
    this.word = "";
    this.words = [];
    this.lines = [];
    this.line_length = line_length;
    this.fragment_length = line_length - 1;
  }

  push_line() {
    if (this.words.length > 0) {
      this.lines.push(this.words.join(" "));
      this.words = [];
    }
  }

  line_overflow(): boolean {
    const line = this.words.join(" ") + " " + this.word;
    return line.length > this.line_length;
  }

  push_word() {
    if (this.word === "") {
      return;
    }
    if (this.word.length > this.line_length) {
      this.fragment_word();
      return;
    }
    if (this.line_overflow()) {
      this.push_line();
    }
    this.words.push(this.word);
    this.word = "";
  }

  get_fragments(word: string): string[] {
    let fragments = [];
    if (word.includes("-")) {
      for (let fragment of word.split("-")) {
        if (fragment.length > this.fragment_length) {
          fragments.push(...this.get_fragments(fragment));
        } else {
          fragments.push(fragment);
        }
      }
      return fragments;
    }
    while (word.length > 0) {
      let fragment = word.slice(0, this.fragment_length);
      fragments.push(fragment);
      word = word.slice(this.fragment_length);
    }
    return fragments;
  }

  fragment_word() {
    const fragments = this.get_fragments(this.word).join("-\n").split("\n");
    for (let fragment of fragments) {
      this.word = fragment;
      this.push_word();
    }
    // By this point, we have pushed 2 or more words,
    // and this.word is empty
  }

  main_loop() {
    for (let c of this.remaining) {
      if (c === " ") {
        this.push_word();
      } else {
        this.word = this.word + c;
      }
    }
    this.push_word();
    this.push_line();
  }

  run(): string {
    if (this.original === "" || this.original.includes("\n")) {
      return this.original;
    }
    if (this.remaining === "") {
      return "";
    }
    this.main_loop();
    return this.lines.join("\n");
  }
}

export function text_wrap(text: any, line_length: any): string {
  let tw = new TextWrapper(text, line_length);
  return tw.run();
}

// Since we need all clients and the backend to agree on a width and height,
// for the coordinate system in each game, we define those here.
// Thus, by default we create games and canvas elements with a 1280x720px resolution.
// There are various situations where the actual canvas has a different size,
// for example due to retina displays (window.devicePixelRatio), browser zoom level,
// and CSS (max-width, CSS grid, etc.).
// The frontend code can account for this, and translate mouse offsets as well
// as draw on a canvas object with a different width and height.
export function standard_canvas_width(): number {
  return 1280;
}

export function standard_canvas_height(): number {
  return 720;
}

const USERNAMES = ["Turtle", "Bison", "Cheetah", "Gecko", "Orca", "Camel"];

export function random_element<T>(a: Array<T>): T {
  return a[Math.floor(Math.random() * a.length)];
}

export function get_random_username(): string {
  return random_element(USERNAMES);
}

export function get_cookie(key: string): string | null {
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${key}=`))
    ?.split("=")[1];
  if (value === undefined) {
    return null;
  }
  return value;
}

export function set_cookie(key: string, value: string) {
  document.cookie = `${key}=${value}; Secure`;
}

export function get_random_userid(): string {
  const array = new Uint32Array(14);
  const digits = array.map((_) => randint(0, 9));
  return digits.join("");
}

export function left_pad(s: string | number, n: number, pad: string = " ") {
  let result = "" + s;
  while (result.length < n) {
    result = pad + result;
  }
  return result;
}
