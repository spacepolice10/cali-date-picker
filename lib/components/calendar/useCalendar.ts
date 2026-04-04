import { useState } from "react";
import {
  CalendarCoreProps,
  CalendarMonthData,
  CalendarState,
  calendarNavNext,
  calendarNavPrev,
  computeCalendar,
  getCalendarInitialState,
} from "../../core/calendar";

/**
 * @property {date} — date object or date-compatible string to work with
 * @property {onChange} — callback that returns date selected inside calendar
 * @property {startsFromDate} — date that will be used as a starting point to draw calendar from. If chosen July of 2002, even though `date` is May of 2020, `useCalendar` will return days of July 2002
 * @property {monthsNumberToDraw} — amount of months to return from hook. It might be useful when showing a lof of months is necessary (e.g. for building full-fledged calendars)
 * @property {locale} — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#locales
 * @property {timezone} — https://www.iana.org/time-zones
 */
export type useCalendarType = CalendarCoreProps;

export type useCalendarReturnType = {
  date: Date;
  months: CalendarMonthData[];
  selectPrev: () => void;
  selectNext: () => void;
};

export type generateListOfMonthsType = CalendarMonthData[];

export type generateListOfDaysInAMonthWithOffsetType =
  CalendarMonthData["days"];

export const useCalendar = (propList: useCalendarType): useCalendarReturnType => {
  const [state, setState] = useState<CalendarState>(() =>
    getCalendarInitialState(propList)
  );

  const { date, months } = computeCalendar(propList, state);

  function selectPrev() {
    setState(calendarNavPrev(propList, state));
  }
  function selectNext() {
    setState(calendarNavNext(propList, state));
  }

  return { date, months, selectPrev, selectNext };
};
