import { JsonObject } from "type-fest";

interface CoatLockfileFileEntryBase extends JsonObject {
  /**
   * The relative path from the coat project root directory
   */
  path: string;
}

interface CoatLockfileOnceFileEntry extends CoatLockfileFileEntryBase {
  /**
   * Whether the file was generated only once or is continously managed
   */
  once: true;
}

interface CoatLockfileContinuousFileEntry extends CoatLockfileFileEntryBase {
  /**
   * Whether the file was generated only once or is continously managed
   */
  once?: false;
  /**
   * The SHA3-512 hash of the file that will be used when removing
   * the file to verify that the content has not been modified outside
   * of coat to prevent accidental loss of data.
   *
   * Only exists for files where once = false, since files that
   * are generated once are not updated or deleted by coat
   */
  hash: string;
}

type CoatLockfileFileEntry =
  | CoatLockfileOnceFileEntry
  | CoatLockfileContinuousFileEntry;

type CoatLockfileOnceFileEntryStrict = CoatLockfileOnceFileEntry;

export interface CoatLockfileContinuousFileEntryStrict
  extends CoatLockfileContinuousFileEntry {
  /**
   * Whether the file was generated only once or is continously managed
   */
  once: false;
}

export type CoatLockfileFileEntryStrict =
  | CoatLockfileOnceFileEntryStrict
  | CoatLockfileContinuousFileEntryStrict;

export interface CoatGlobalLockfile extends JsonObject {
  /**
   * The lockfile version
   */
  version: number;
  files?: CoatLockfileFileEntry[];
  setup?: Record<string, JsonObject>;
  scripts?: string[];
  dependencies?: {
    dependencies?: string[];
    devDependencies?: string[];
    peerDependencies?: string[];
    optionalDependencies?: string[];
  };
}

export interface CoatGlobalLockfileStrict extends CoatGlobalLockfile {
  /**
   * Managed global file entries that have been previously
   * generated in this coat project
   */
  files: CoatLockfileFileEntryStrict[];
  /**
   * Global setup task results, stored as
   * taskId: { taskResultProperty: A }
   */
  setup: Record<string, JsonObject>;
  /**
   * package.json script names that are managed by coat
   */
  scripts: string[];
  /**
   * package.json dependency types that are managed by coat
   */
  dependencies: {
    /**
     * names of managed package.json dependencies
     */
    dependencies: string[];
    /**
     * names of managed package.json devDependencies
     */
    devDependencies: string[];
    /**
     * names of managed package.json peerDependencies
     */
    peerDependencies: string[];
    /**
     * names of managed package.json optionalDependencies
     */
    optionalDependencies: string[];
  };
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
   * Local setup task results, stored as
   * taskId: { taskResultProperty: A }
   */
  setup: Record<string, JsonObject>;
}
