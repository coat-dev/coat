import { JsonObject } from "type-fest";

export interface CoatLockfileFileEntry extends JsonObject {
  /**
   * The relative path from the coat project root directory
   */
  path: string;
  once?: boolean;
}

interface CoatLockfileFileEntryStrict extends CoatLockfileFileEntry {
  /**
   * Whether the file was generated only once or is continously managed
   */
  once: boolean;
}

export interface CoatGlobalLockfile extends JsonObject {
  /**
   * The lockfile version
   */
  version: number;
  files?: CoatLockfileFileEntry[];
  setup?: Record<string, JsonObject>;
}

export interface CoatGlobalLockfileStrict extends CoatGlobalLockfile {
  /**
   * Managed global file entries that have been previously
   * generated in this coat project
   */
  files: CoatLockfileFileEntryStrict[];
  /**
   * Global setup task results, stored by
   * taskId: { taskResultProperty: A }
   */
  setup: Record<string, JsonObject>;
}

export interface CoatLocalLockfile extends JsonObject {
  /**
   * The lockfile version
   */
  version: number;
  files?: CoatLockfileFileEntry[];
  setup?: Record<string, JsonObject>;
}
export interface CoatLocalLockfileStrict extends CoatLocalLockfile {
  /**
   * Managed local file entries that have been previously
   * generated in this coat project
   */
  files: CoatLockfileFileEntryStrict[];
  /**
   * Local setup task results, stored by
   * taskId: { taskResultProperty: A }
   */
  setup: Record<string, JsonObject>;
}
