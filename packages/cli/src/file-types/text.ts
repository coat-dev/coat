import singleTrailingNewline from "single-trailing-newline";
import { FileTypeFunctions } from ".";
import { CoatContext } from "../types/coat-context";
import { getPrettier } from "../util/get-prettier";

function merge(
  _source: string | null | undefined,
  target: string
): string | null {
  // The default "merge" for text files simply returns
  // the target string, without looking at the source
  // string.
  return target;
}

function polish(
  source: string,
  filePath: string,
  context: CoatContext
): string {
  const prettier = getPrettier(context);

  // Check whether prettier can infer a parser
  // for the file. If it can, the file should
  // be styled via prettier, otherwise only a
  // new line at the end should be added
  const fileInfo = prettier.getFileInfo.sync(filePath);
  if (fileInfo.inferredParser) {
    return prettier.format(source, { filepath: filePath });
  }

  // Only the end of a text file should be modified, by
  // either adding or removing new lines to get a consistent
  // single trailing new line at the end of the file.
  return singleTrailingNewline(source);
}

export const textFileFunctions: FileTypeFunctions<string> = {
  merge,
  polish,
};
