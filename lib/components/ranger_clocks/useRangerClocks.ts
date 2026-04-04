import { useState } from "react";
import {
  RangerClocksCoreProps,
  RangerClocksState,
  RangerClocksTimeSlot,
  computeRangerClocks,
  getRangerClocksInitialState,
  rangerClocksNavNext,
  rangerClocksNavPrev,
} from "../../core/rangerClocks";

export type useRangerClocksType = RangerClocksCoreProps;

export type useRangerClocksReturnType = {
  combinedData: string;
  time: generateTimeListType;
  selectPrev: () => void;
  selectNext: () => void;
};

export type generateTimeListType = RangerClocksTimeSlot[][];

export function useRangerClocks(
  propList: useRangerClocksType
): useRangerClocksReturnType {
  const [state, setState] = useState<RangerClocksState>(() =>
    getRangerClocksInitialState(propList)
  );

  function onHoverChange(timestamp: number) {
    setState((prev: RangerClocksState) => ({ ...prev, willBeRangesEndsWith: timestamp }));
  }

  const { combinedData, time } = computeRangerClocks(propList, state, onHoverChange);

  function selectPrev() {
    setState(rangerClocksNavPrev(state));
  }
  function selectNext() {
    setState(rangerClocksNavNext(state));
  }

  return { combinedData, time, selectPrev, selectNext };
}
