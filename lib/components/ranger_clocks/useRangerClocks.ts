import { useState } from "react";

export type useRangerClocksType = {
  startsWithDate?: Date | null;
  endsWithDate?: Date | null;
  startsFromDate?: Date | null;
  daysNumberToDraw?: number;
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
    typeof propList.startsFromDate == "string"
      ? new Date(propList.startsFromDate)
      : propList.startsFromDate
  );
  const [willBeRangesEndsWith, changeWillBeRangesEndsWith] = useState<number>(0);

  const [starts, ends] = [
    propList.startsWithDate
      ? new Date(propList.startsWithDate).getTime()
      : undefined,
    propList.endsWithDate ? new Date(propList.endsWithDate).getTime() : undefined,
  ].sort() as number[];
  const [startsBeforeSelect, endsBeforeSelect] = [
    propList.startsWithDate
      ? new Date(propList.startsWithDate).getTime()
      : undefined,
    new Date(willBeRangesEndsWith).getTime(),
  ].sort() as number[];
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

        const isInRanges = date.getTime() >= starts && date.getTime() <= ends;
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
        return {
          isInRanges,
          isInRangesBeforeSelect,
          date,
          minute,
          timeSelectPropList: {
            onMouseOver: () => changeWillBeRangesEndsWith(date.getTime()),
            onMouseLeave: () => changeWillBeRangesEndsWith(0),
            onClick: changeTime,
            key: new Date(date).getTime(),
          },
        };
      });
      timeList.push(time);
    }
    return timeList;
  }

  function selectPrev() {
    const sf = startsFrom ?? new Date();
    const updateDate = new Date(sf.setMonth(sf.getDate() - 1));
    changeStartsFrom(updateDate);
  }
  function selectNext() {
    const sf = startsFrom ?? new Date();
    const updateDate = new Date(sf.setMonth(sf.getDate() + 1));
    changeStartsFrom(updateDate);
  }

  return {
    combinedData: [
      propList.startsWithDate?.toLocaleTimeString(),
      propList.endsWithDate?.toLocaleTimeString(),
    ]
      .sort()
      .join(" "),
    time: generateTimeList(),
    selectPrev,
    selectNext,
  };
}
