import { coerceToDate, createDate } from "./createDate";

export type CalendarCoreProps = {
  date: Date | string;
  onChange: (date: Date) => void;
  startsFromDate?: Date | string;
  monthsNumberToDraw?: number;
  locale?: string;
  timezone?: string;
};

/** Internal navigation state — no React, no framework. */
export type CalendarState = {
  startsFrom: Date | undefined;
};

export type CalendarDayData = {
  daysNumber: number;
  daysName: string;
  isActive: boolean;
  isSelected: boolean;
  selectDate: () => void;
  dateSelectPropList: { onClick: () => void; key: string };
};

export type CalendarMonthData = {
  monthsName: string;
  days: (CalendarDayData | string)[];
  yearNumber: number;
  monthsNumber: number;
};

export function getCalendarInitialState(
  props: Pick<CalendarCoreProps, "startsFromDate">
): CalendarState {
  return { startsFrom: coerceToDate(props.startsFromDate) };
}

export function computeCalendar(
  props: CalendarCoreProps,
  state: CalendarState
): { date: Date; months: CalendarMonthData[] } {
  const date = createDate({
    date: coerceToDate(props.date),
    locale: props.locale,
  });

  function generateListOfDaysInAMonthWithOffset(
    monthsDate: Date
  ): (CalendarDayData | string)[] {
    const monthsDateData = createDate({ date: monthsDate, locale: props.locale });
    const offset: string[] = Array(monthsDateData.firstMonthDate).fill("");
    const days: CalendarDayData[] = Array.from(
      Array(monthsDateData.amountOfDaysInAMonth).keys()
    ).map((d) => {
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
        date.hourNumber,
        date.minuteNumber,
        date.secondNumber
      );
      const daysName = daysFullDateWithTime.toLocaleString(props.locale, {
        weekday: "long",
      });
      const isActive = monthsDateData.activeDate === daysFullDate;
      const isSelected =
        (coerceToDate(props.date)?.toLocaleDateString() ?? "") === daysFullDate;

      function selectDate() {
        props.onChange(daysFullDateWithTime);
      }
      return {
        daysNumber,
        daysName,
        isActive,
        isSelected,
        selectDate,
        dateSelectPropList: {
          onClick: () => selectDate(),
          key: daysFullDate.toString(),
        },
      };
    });
    return [...offset, ...days];
  }

  const dateData = createDate({
    date: state.startsFrom ?? coerceToDate(props.date),
    locale: props.locale,
  });

  const months: CalendarMonthData[] = Array.from(
    Array(props.monthsNumberToDraw).keys()
  ).map((m) => {
    const monthsFullDate = new Date(
      dateData.yearNumber,
      dateData.monthsNumber + m - 1,
      dateData.daysNumber
    );
    return {
      monthsName: dateData.monthsName,
      days: generateListOfDaysInAMonthWithOffset(monthsFullDate),
      yearNumber: dateData.yearNumber,
      monthsNumber: dateData.monthsNumber,
    };
  });

  return {
    date: coerceToDate(props.date) ?? new Date(),
    months,
  };
}

export function calendarNavPrev(
  props: Pick<CalendarCoreProps, "date">,
  state: CalendarState
): CalendarState {
  const sf = new Date(state.startsFrom ?? coerceToDate(props.date) ?? new Date());
  sf.setMonth(sf.getMonth() - 1);
  return { startsFrom: sf };
}

export function calendarNavNext(
  props: Pick<CalendarCoreProps, "date">,
  state: CalendarState
): CalendarState {
  const sf = new Date(state.startsFrom ?? coerceToDate(props.date) ?? new Date());
  sf.setMonth(sf.getMonth() + 1);
  return { startsFrom: sf };
}
