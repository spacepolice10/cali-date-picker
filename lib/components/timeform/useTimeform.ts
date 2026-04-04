import {
  TimeformCoreProps,
  TimeformCoreResult,
  TimeformInputProps,
  computeTimeform,
} from "../../core/timeform";
import type { InputChangeEvent } from "../../core/dateform";

export type useTimeformType = TimeformCoreProps;
export type useTimeformReturnType = TimeformCoreResult;
export type timeformType = TimeformInputProps;
export type { InputChangeEvent };

export const useTimeform = (propList: useTimeformType): useTimeformReturnType => {
  return computeTimeform(propList);
};
