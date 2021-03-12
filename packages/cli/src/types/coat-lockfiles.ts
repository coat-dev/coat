import { JsonObject } from "type-fest";

/**
 * @minLength 1
 */
type NonEmptyString = string;

interface CoatLockfileFileEntryBase extends JsonObject {
  /**
   * The relative path from the coat project root directory
   */
  path: NonEmptyString;
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
  hash: NonEmptyString;
}

type CoatLockfileFileEntry =
  | CoatLockfileOnceFileEntry
  | CoatLockfileContinuousFileEntry;

type CoatLockfileOnceFileEntryStrict = CoatLockfileOnceFileEntry;

export type CoatLockfileContinuousFileEntryStrict = Required<CoatLockfileContinuousFileEntry>;

export type CoatLockfileFileEntryStrict =
  | CoatLockfileOnceFileEntryStrict
  | CoatLockfileContinuousFileEntryStrict;

export interface CoatGlobalLockfile extends JsonObject {
  /**
   * The lockfile version
   *
   * @minimum 1
   * @asType integer
   */
  version: number;
  files?: CoatLockfileFileEntry[];
  /**
   * Global setup task results, stored as
   * taskId: { taskResultProperty: A }
   */
  setup?: Record<NonEmptyString, JsonObject>;
  /**
   * package.json script names that are managed by coat
   */
  scripts?: NonEmptyString[];
  dependencies?: {
    /**
     * names of managed package.json dependencies
     */
    dependencies?: NonEmptyString[];
    /**
     * names of managed package.json devDependencies
     */
    devDependencies?: NonEmptyString[];
    /**
     * names of managed package.json peerDependencies
     */
    peerDependencies?: NonEmptyString[];
    /**
     * names of managed package.json optionalDependencies
     */
    optionalDependencies?: NonEmptyString[];
  };
}

export interface CoatGlobalLockfileStrict extends Required<CoatGlobalLockfile> {
  /**
   * Managed global file entries that have been previously
   * generated in this coat project
   */
  files: CoatLockfileFileEntryStrict[];
  /**
   * package.json dependency types that are managed by coat
   */
  dependencies: Required<Required<CoatGlobalLockfile>["dependencies"]>;
}

export interface CoatLocalLockfile extends JsonObject {
  /**
   * The lockfile version
   *
   * @minimum 1
   * @asType integer
   */
  version: number;
  files?: CoatLockfileFileEntry[];
  /**
   * Local setup task results, stored as
   * taskId: { taskResultProperty: A }
   */
  setup?: Record<NonEmptyString, JsonObject>;
}
export interface CoatLocalLockfileStrict extends Required<CoatLocalLockfile> {
  /**
   * Managed local file entries that have been previously
   * generated in this coat project
   */
  files: CoatLockfileFileEntryStrict[];
}
