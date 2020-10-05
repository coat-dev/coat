import fs from "fs-extra";
import { produce } from "immer";
import path from "path";
import {
  COAT_LOCAL_LOCKFILE_PATH,
  COAT_GLOBAL_LOCKFILE_PATH,
} from "../constants";
import { yamlFileFunctions } from "../file-types/yaml";
import { CoatContext } from "../types/coat-context";
import {
  CoatGlobalLockfile,
  CoatGlobalLockfileStrict,
  CoatLocalLockfile,
  CoatLocalLockfileStrict,
} from "../types/coat-lockfiles";

function stripEmptyPropertiesGlobal(
  lockfile: CoatGlobalLockfileStrict
): CoatGlobalLockfile {
  return produce(lockfile, (draft: CoatGlobalLockfile) => {
    if (!lockfile.files.length) {
      delete draft.files;
    } else {
      // Only place the "once" property if it is true
      draft.files?.forEach((file) => {
        if ("once" in file && !file.once) {
          // eslint-disable-next-line no-param-reassign
          delete file.once;
        }
      });
    }

    if (!Object.keys(lockfile.setup).length) {
      delete draft?.setup;
    }

    if (!lockfile.scripts.length) {
      delete draft.scripts;
    }

    if (!lockfile.dependencies.dependencies.length) {
      delete draft.dependencies?.dependencies;
    }
    if (!lockfile.dependencies.devDependencies.length) {
      delete draft.dependencies?.devDependencies;
    }
    if (!lockfile.dependencies.peerDependencies.length) {
      delete draft.dependencies?.peerDependencies;
    }
    if (!lockfile.dependencies.optionalDependencies.length) {
      delete draft.dependencies?.optionalDependencies;
    }

    // If no dependency key exists, the dependencies
    // property should also be deleted
    if (
      !Object.keys(
        draft.dependencies as CoatGlobalLockfileStrict["dependencies"]
      ).length
    ) {
      delete draft.dependencies;
    }
  });
}

function stripEmptyPropertiesLocal(
  lockfile: CoatLocalLockfileStrict
): CoatLocalLockfile {
  return produce(lockfile, (draft: CoatLocalLockfile) => {
    if (!lockfile.files.length) {
      delete draft.files;
    } else {
      // Only place the "once" property if it is true
      draft.files?.forEach((file) => {
        if ("once" in file && !file.once) {
          // eslint-disable-next-line no-param-reassign
          delete file.once;
        }
      });
    }

    if (draft.setup && !Object.keys(draft.setup).length) {
      delete draft.setup;
    }
  });
}

async function writeLockfile(
  coatLockfile: CoatGlobalLockfile | CoatLocalLockfile,
  lockfilePath: string,
  context: CoatContext
): Promise<void> {
  const lockfileContent = yamlFileFunctions.polish(
    coatLockfile,
    lockfilePath,
    context
  );
  await fs.outputFile(lockfilePath, lockfileContent);
}

/**
 * Strips all unnecessary properties from the provided lockfile and
 * writes the result to the global lockfile location:
 * project-dir/coat.lock
 *
 * @param coatLockfile The new global lockfile that should be written to the disk
 * @param context The context of the current coat project
 */
export async function writeGlobalLockfile(
  coatLockfile: CoatGlobalLockfileStrict,
  context: CoatContext
): Promise<void> {
  const lockfilePath = path.join(context.cwd, COAT_GLOBAL_LOCKFILE_PATH);
  // Strip properties to not save empty properties onto the disk
  const leanLockfile = stripEmptyPropertiesGlobal(coatLockfile);
  await writeLockfile(leanLockfile, lockfilePath, context);
}

/**
 * Strips all unnecessary properties from the provided lockfile and
 * writes the result to the local lockfile location:
 * project-dir/.coat/coat.lock
 *
 * @param coatLockfile The new local lockfile that should be written to the disk
 * @param context The context of the current coat project
 */
export async function writeLocalLockfile(
  coatLockfile: CoatLocalLockfileStrict,
  context: CoatContext
): Promise<void> {
  const lockfilePath = path.join(context.cwd, COAT_LOCAL_LOCKFILE_PATH);
  // Strip properties to not save empty properties onto the disk
  const leanLockfile = stripEmptyPropertiesLocal(coatLockfile);
  await writeLockfile(leanLockfile, lockfilePath, context);
}
