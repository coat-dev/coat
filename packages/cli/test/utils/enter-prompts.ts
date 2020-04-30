import { Writable } from "stream";

export enum KeyboardInput {
  Enter = "\x0D",
  ArrowUp = "\x1B\x5B\x41",
  ArrowDown = "\x1B\x5B\x42",
}

export function enterPrompts(stdin: Writable | null, inputs: string[]): void {
  if (!stdin) {
    throw new Error("stdin is not defined!");
  }

  stdin.setDefaultEncoding("utf8");
  inputs.forEach((input) => {
    stdin.write(input);
  });
  stdin.end();
}
