import { ValidateFunction } from "ajv";
import { CoatGlobalLockfile, CoatLocalLockfile } from "../types/coat-lockfiles";

export const validateCoatGlobalLockfile: ValidateFunction<CoatGlobalLockfile>;
export const validateCoatLocalLockfile: ValidateFunction<CoatLocalLockfile>;
