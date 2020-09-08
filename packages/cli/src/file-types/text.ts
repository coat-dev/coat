import singleTrailingNewline from "single-trailing-newline";
import { FileTypeFunctions } from ".";

function merge(
  _source: string | null | undefined,
  target: string
): string | null {
  // The default "merge" for text files simply returns
  // the target string, without looking at the source
  // string.
  return target;
}

function polish(source: string): string {
  // Only the end of a text file should be modified, by
  // either adding or removing new lines to get a consistent
  // single trailing new line at the end of the file.
  return singleTrailingNewline(source);
}

export const textFileFunctions: FileTypeFunctions<string> = {
  merge,
  polish,
};
