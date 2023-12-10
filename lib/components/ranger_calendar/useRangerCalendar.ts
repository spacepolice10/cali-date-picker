import { useState } from "react";
import { createDate } from "../createDate";

export type useRangerCalendarType = {
  startsWithDate: Date | string;
  endsWithDate: Date | string;
  startsFromDate?: Date | string;
  monthsNumberToDraw?: number;
  locale?: string;
  timezone?: string;
  onStartsWithDateChange: (date: Date | string | null) => void;
  onEndsWithDateChange: (date: Date | string | null) => void;
};

export type useRangerCalendarReturnType = {
  combinedDate: Date | string;
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
    typeof propList.startsFromDate == "string"
      ? new Date(propList.startsFromDate)
      : propList.startsFromDate
  );
  const [willBeRangesEndsWith, changeWillBeRangesEndsWith] = useState<
    string | null
  >(null);

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
      ).toLocaleDateString();
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
      const [starts, ends] = [
        propList.startsWithDate,
        propList.endsWithDate,
      ].sort();
      const [startsBeforeSelect, endsBeforeSelect] = [
        propList.startsWithDate,
        willBeRangesEndsWith,
      ].sort();
      const isInRanges =
        daysFullDate >= (starts ?? "") && daysFullDate <= (ends ?? "");
      const isInRangesBeforeSelect =
        daysFullDate >= (startsBeforeSelect ?? "") &&
        daysFullDate <= (endsBeforeSelect ?? "") &&
        !propList.endsWithDate;
      const isActive = monthsDateData.activeDate == daysFullDate;

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
          onMouseEnter: () => changeWillBeRangesEndsWith(daysFullDate),
          onMouseLeave: () => changeWillBeRangesEndsWith(null),
          onClick: changeDate,
          key: daysFullDate,
        },
        daysNumber,
        daysName,
        isActive,
        isInRanges: isInRanges || isInRangesBeforeSelect,
      };
    });
    return [...offset, ...days];
  }

  function selectPrev() {
    const sf = startsFrom ?? new Date();
    const updateDate = new Date(sf.setMonth(sf.getMonth() - 1));
    changeStartsFrom(updateDate);
  }
  function selectNext() {
    const sf = startsFrom ?? new Date();
    const updateDate = new Date(sf.setMonth(sf.getMonth() + 1));
    changeStartsFrom(updateDate);
  }

  return {
    combinedDate: "",
    months: overrideGenerateListOfMonths(),
    selectPrev,
    selectNext,
  };
};
