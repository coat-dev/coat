import { Jsonifiable } from "type-fest";

export type JsonifiableObject = { [Key in string]?: Jsonifiable };
