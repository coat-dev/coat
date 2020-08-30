import { JsonObject, ValueOf } from "type-fest";

export enum CoatManifestFileType {
  Json = "JSON",
  Text = "TEXT",
  Yaml = "YAML",
}

export interface CoatManifestFileContentTypesMap {
  [CoatManifestFileType.Json]: JsonObject;
  [CoatManifestFileType.Text]: string;
  [CoatManifestFileType.Yaml]: JsonObject;
}

export type CoatManifestFileContentType = ValueOf<
  CoatManifestFileContentTypesMap
>;

export interface CoatManifestFileBase<FileType extends CoatManifestFileType> {
  file: string;
  type: FileType;
  content:
    | CoatManifestFileContentTypesMap[FileType]
    | ((
        previous: CoatManifestFileContentTypesMap[FileType] | undefined | null
      ) => null | CoatManifestFileContentTypesMap[FileType])
    | null;
}

type UnionizeFileTypes<FileType> = FileType extends CoatManifestFileType
  ? CoatManifestFileBase<FileType>
  : never;

export type CoatManifestFile = UnionizeFileTypes<CoatManifestFileType>;

export type CoatManifestMergedFile = Omit<CoatManifestFile, "content"> & {
  content: CoatManifestFileContentType;
};
