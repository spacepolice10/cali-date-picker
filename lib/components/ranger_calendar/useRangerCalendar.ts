import { useState } from "react";
import {
  RangerCalendarCoreProps,
  RangerCalendarMonthData,
  RangerCalendarState,
  computeRangerCalendar,
  getRangerCalendarInitialState,
  rangerCalendarNavNext,
  rangerCalendarNavPrev,
} from "../../core/rangerCalendar";

export type useRangerCalendarType = RangerCalendarCoreProps;

export type useRangerCalendarReturnType = {
  months: overrideGenerateListOfMonthsType;
  selectPrev: () => void;
  selectNext: () => void;
};

export type overrideGenerateListOfMonthsType = RangerCalendarMonthData[];

export type overrideGenerateListOfDaysInAMonthWithOffsetType =
  RangerCalendarMonthData["days"];

export const useRangerCalendar = (propList: useRangerCalendarType) => {
  const [state, setState] = useState<RangerCalendarState>(() =>
    getRangerCalendarInitialState(propList)
  );

  function onHoverChange(timestamp: number) {
    setState((prev: RangerCalendarState) => ({ ...prev, willBeRangesEndsWith: timestamp }));
  }

  const { months } = computeRangerCalendar(propList, state, onHoverChange);

  function selectPrev() {
    setState(rangerCalendarNavPrev(propList, state));
  }
  function selectNext() {
    setState(rangerCalendarNavNext(propList, state));
  }

  return { months, selectPrev, selectNext };
};
