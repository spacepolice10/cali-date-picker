import { useState } from "react";
import { coerceToDate, createDate } from "../createDate";

export type useRangerCalendarType = {
  startsWithDate?: Date | null;
  endsWithDate?: Date | null;
  startsFromDate?: Date | null;
  monthsNumberToDraw?: number;
  locale?: string;
  timezone?: string;
  onStartsWithDateChange: (date: Date | string | null) => void;
  onEndsWithDateChange: (date: Date | string | null) => void;
};

export type useRangerCalendarReturnType = {
  months: overrideGenerateListOfMonthsType;
  selectPrev: () => void;
  selectNext: () => void;
};

export type overrideGenerateListOfMonthsType = {
  monthsName: string;
  days: overrideGenerateListOfDaysInAMonthWithOffsetType;
  yearNumber: number;
  monthsNumber: number;
}[];

export type overrideGenerateListOfDaysInAMonthWithOffsetType = {
  isActive: boolean;
  isSelected: boolean;
  isInRanges: boolean;
  isInRangesBeforeSelect: boolean;
  daysNumber: number;
  daysName: string;
  dateSelectPropList: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onClick: () => void;
    key: string;
  };
}[];

export const useRangerCalendar = (propList: useRangerCalendarType) => {
  const [startsFrom, changeStartsFrom] = useState(
    coerceToDate(propList.startsFromDate)
  );
  const [willBeRangesEndsWith, changeWillBeRangesEndsWith] = useState<number>(0);

  function overrideGenerateListOfMonths(): overrideGenerateListOfMonthsType {
    const dateData = createDate({
      date: startsFrom,
      locale: propList.locale,
    });
    return Array.from(Array(propList.monthsNumberToDraw).keys()).map((m) => {
      const monthsFullDate = new Date(
        dateData.yearNumber,
        // compensate difference between number of months in JS & actual calendar
        dateData.monthsNumber + m - 1,
        dateData.daysNumber
      );
      const days = overrideGenerateListOfDaysInAMonthWithOffset(monthsFullDate);
      return {
        monthsName: dateData.monthsName,
        days,
        yearNumber: dateData.yearNumber,
        monthsNumber: dateData.monthsNumber,
      };
    });
  }

  function overrideGenerateListOfDaysInAMonthWithOffset(
    monthsDate: Date
  ): overrideGenerateListOfDaysInAMonthWithOffsetType {
    const monthsDateData = createDate({
      date: monthsDate,
      locale: propList.locale,
    });

    // Compute range boundaries once, outside the per-day loop
    const startT = propList.startsWithDate
      ? new Date(propList.startsWithDate).setHours(0, 0, 0, 0)
      : undefined;
    const endT = propList.endsWithDate
      ? new Date(propList.endsWithDate).setHours(0, 0, 0, 0)
      : undefined;
    const starts = startT !== undefined && endT !== undefined ? Math.min(startT, endT) : startT;
    const ends = startT !== undefined && endT !== undefined ? Math.max(startT, endT) : endT;

    const hoverT = new Date(willBeRangesEndsWith).setHours(0, 0, 0, 0);
    const startsBeforeSelect = startT !== undefined ? Math.min(startT, hoverT) : hoverT;
    const endsBeforeSelect = startT !== undefined ? Math.max(startT, hoverT) : hoverT;

    const offset = Array(monthsDateData.firstMonthDate).fill("");
    const days = Array.from(
      Array(monthsDateData.amountOfDaysInAMonth).keys()
    ).map((d) => {
      // compensate difference between number of months/days in JS & actual calendar
      const daysNumber = d + 1;
      const daysFullDate = new Date(
        monthsDateData.yearNumber,
        monthsDateData.monthsNumber - 1,
        daysNumber,
        0
      );
      const daysFullDateWithTime = new Date(
        monthsDateData.yearNumber,
        monthsDateData.monthsNumber - 1,
        daysNumber,
        new Date().getHours(),
        new Date().getMinutes(),
        new Date().getSeconds()
      );
      const daysName = daysFullDateWithTime.toLocaleString(propList.locale, {
        weekday: "long",
      });

      const t = daysFullDate.setHours(0, 0, 0, 0);
      const isInRanges = starts !== undefined && ends !== undefined && t >= starts && t <= ends;
      const isInRangesBeforeSelect =
        t >= startsBeforeSelect && t <= endsBeforeSelect && !propList.endsWithDate;
      const isActive =
        monthsDateData.activeDate == daysFullDate.toLocaleDateString();
      const dayStr = daysFullDate.toLocaleDateString();
      const isSelected =
        (propList.startsWithDate != null &&
          dayStr === new Date(propList.startsWithDate).toLocaleDateString()) ||
        (propList.endsWithDate != null &&
          dayStr === new Date(propList.endsWithDate).toLocaleDateString());

      function changeDate() {
        if (propList.endsWithDate) {
          propList.onStartsWithDateChange(daysFullDate);
          propList.onEndsWithDateChange(null);
        } else {
          if (propList.startsWithDate) {
            propList.onEndsWithDateChange(daysFullDate);
          } else {
            propList.onStartsWithDateChange(daysFullDate);
          }
        }
      }
      return {
        dateSelectPropList: {
          onMouseEnter: () => changeWillBeRangesEndsWith(daysFullDate.getTime()),
          onMouseLeave: () => changeWillBeRangesEndsWith(0),
          onClick: changeDate,
          key: `${daysFullDate.getTime()}`,
        },
        daysNumber,
        daysName,
        isActive,
        isSelected: !!isSelected,
        isInRanges,
        isInRangesBeforeSelect,
      };
    });
    return [...offset, ...days];
  }

  function selectPrev() {
    const sf = new Date(startsFrom ?? propList.startsWithDate ?? new Date());
    sf.setMonth(sf.getMonth() - 1);
    changeStartsFrom(sf);
  }
  function selectNext() {
    const sf = new Date(startsFrom ?? propList.startsWithDate ?? new Date());
    sf.setMonth(sf.getMonth() + 1);
    changeStartsFrom(sf);
  }

  return {
    months: overrideGenerateListOfMonths(),
    selectPrev,
    selectNext,
  };
};
