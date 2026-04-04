import {
  ClocksCoreProps,
  ClocksTimeItem,
  computeClocks,
} from "../../core/clocks";

export type useClocksType = ClocksCoreProps;

export type useClocksReturnType = {
  date?: Date;
  hourList: generateTimeListReturnType;
  minuteList: generateTimeListReturnType;
  secondList: generateTimeListReturnType;
};

export type generateTimeListReturnType = ClocksTimeItem[];

export const useClocks = (propList?: useClocksType): useClocksReturnType => {
  if (!propList) {
    return { date: undefined, hourList: [], minuteList: [], secondList: [] };
  }
  return computeClocks(propList);
};
