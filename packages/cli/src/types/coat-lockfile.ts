import { JsonObject } from "type-fest";

export interface CoatLockfile extends JsonObject {
  version: number;
  files: {
    path: string;
  }[];
}
