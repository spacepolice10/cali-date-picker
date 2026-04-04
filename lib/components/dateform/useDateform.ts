import {
  DateformCoreProps,
  DateformCoreResult,
  DateformInputProps,
  InputChangeEvent,
  computeDateform,
} from "../../core/dateform";

export type useDateformType = DateformCoreProps;
export type useDateformReturnType = DateformCoreResult;
export type dateformType = DateformInputProps;
export type { InputChangeEvent };

export const useDateform = (propList?: useDateformType): useDateformReturnType => {
  if (!propList) {
    return {
      yearFormPropList: { onChange: () => {}, maxLength: 4 },
      daysFormPropList: { onChange: () => {}, maxLength: 2 },
      monthsFormPropList: { onChange: () => {}, maxLength: 2 },
    };
  }
  return computeDateform(propList);
};
