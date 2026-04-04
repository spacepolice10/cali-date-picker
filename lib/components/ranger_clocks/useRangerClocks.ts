import { useState } from "react";
import { coerceToDate } from "../createDate";

export type useRangerClocksType = {
  startsWithDate?: Date | null;
  endsWithDate?: Date | null;
  startsFromDate?: Date | null;
  locale?: string;
  timezone?: string;
  onStartsWithDateChange: (date: Date | string | null) => void;
  onEndsWithDateChange: (date: Date | string | null) => void;
};

export type useRangerClocksReturnType = {
  combinedData: string;
  time: generateTimeListType;
  selectPrev: () => void;
  selectNext: () => void;
};

export type generateTimeListType = {
  isActive: boolean;
  isSelected: boolean;
  isInRanges: boolean;
  isInRangesBeforeSelect: boolean;
  minute: string;
  date: Date;
  timeSelectPropList: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onClick: () => void;
    key: string;
  };
}[][];

export function useRangerClocks(
  propList: useRangerClocksType
): useRangerClocksReturnType {
  const [startsFrom, changeStartsFrom] = useState(
    coerceToDate(propList.startsFromDate)
  );
  const [willBeRangesEndsWith, changeWillBeRangesEndsWith] = useState<number>(0);

  const startT = propList.startsWithDate
    ? new Date(propList.startsWithDate).getTime()
    : undefined;
  const endT = propList.endsWithDate
    ? new Date(propList.endsWithDate).getTime()
    : undefined;
  const starts = startT !== undefined && endT !== undefined ? Math.min(startT, endT) : startT;
  const ends = startT !== undefined && endT !== undefined ? Math.max(startT, endT) : endT;

  const hoverT = new Date(willBeRangesEndsWith).getTime();
  const startsBeforeSelect = startT !== undefined ? Math.min(startT, hoverT) : hoverT;
  const endsBeforeSelect = startT !== undefined ? Math.max(startT, hoverT) : hoverT;
  function generateTimeList(): generateTimeListType {
    const timeList = [];
    for (let hour = 0; hour < 24; hour++) {
      const time = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((mi) => {
        const date = new Date(
          startsFrom?.getFullYear(),
          startsFrom?.getMonth(),
          startsFrom?.getDate(),
          hour,
          mi
        );
        const minute = date.toLocaleTimeString(propList?.locale, {
          hour: "2-digit",
          minute: "2-digit",
        });

        const isInRanges = starts !== undefined && ends !== undefined && date.getTime() >= starts && date.getTime() <= ends;
        const isInRangesBeforeSelect =
          date.getTime() >= startsBeforeSelect &&
          date.getTime() <= endsBeforeSelect &&
          !propList.endsWithDate;
        function changeTime() {
          if (propList.endsWithDate) {
            propList.onStartsWithDateChange(date);
            propList.onEndsWithDateChange(null);
          } else {
            if (propList.startsWithDate) {
              propList.onEndsWithDateChange(date);
            } else {
              propList.onStartsWithDateChange(date);
            }
          }
        }
        const isActive = date.toLocaleDateString() === new Date().toLocaleDateString();
        const isSelected =
          (propList.startsWithDate != null &&
            date.getTime() === new Date(propList.startsWithDate).getTime()) ||
          (propList.endsWithDate != null &&
            date.getTime() === new Date(propList.endsWithDate).getTime());
        return {
          isActive,
          isSelected,
          isInRanges,
          isInRangesBeforeSelect,
          date,
          minute,
          timeSelectPropList: {
            onMouseEnter: () => changeWillBeRangesEndsWith(date.getTime()),
            onMouseLeave: () => changeWillBeRangesEndsWith(0),
            onClick: changeTime,
            key: `${new Date(date).getTime()}`,
          },
        };
      });
      timeList.push(time);
    }
    return timeList;
  }

  function selectPrev() {
    const sf = new Date(startsFrom ?? new Date());
    sf.setDate(sf.getDate() - 1);
    changeStartsFrom(sf);
  }
  function selectNext() {
    const sf = new Date(startsFrom ?? new Date());
    sf.setDate(sf.getDate() + 1);
    changeStartsFrom(sf);
  }

  const combinedData =
    propList.startsWithDate != null && propList.endsWithDate != null
      ? [
          new Date(Math.min(new Date(propList.startsWithDate).getTime(), new Date(propList.endsWithDate).getTime())).toLocaleTimeString(propList.locale),
          new Date(Math.max(new Date(propList.startsWithDate).getTime(), new Date(propList.endsWithDate).getTime())).toLocaleTimeString(propList.locale),
        ].join(" ")
      : "";

  return {
    combinedData,
    time: generateTimeList(),
    selectPrev,
    selectNext,
  };
}
