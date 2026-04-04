import { coerceToDate, createDate } from "./createDate";

export type RangerCalendarCoreProps = {
  startsWithDate?: Date | null;
  endsWithDate?: Date | null;
  startsFromDate?: Date | null;
  monthsNumberToDraw?: number;
  locale?: string;
  timezone?: string;
  onStartsWithDateChange: (date: Date | string | null) => void;
  onEndsWithDateChange: (date: Date | string | null) => void;
};

export type RangerCalendarState = {
  startsFrom: Date | undefined;
  willBeRangesEndsWith: number;
};

export type RangerCalendarDayData = {
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
};

export type RangerCalendarMonthData = {
  monthsName: string;
  days: (RangerCalendarDayData | string)[];
  yearNumber: number;
  monthsNumber: number;
};

export function getRangerCalendarInitialState(
  props: Pick<RangerCalendarCoreProps, "startsFromDate">
): RangerCalendarState {
  return {
    startsFrom: coerceToDate(props.startsFromDate ?? undefined),
    willBeRangesEndsWith: 0,
  };
}

export function computeRangerCalendar(
  props: RangerCalendarCoreProps,
  state: RangerCalendarState,
  onHoverChange: (timestamp: number) => void
): { months: RangerCalendarMonthData[] } {
  const startT = props.startsWithDate
    ? new Date(props.startsWithDate).setHours(0, 0, 0, 0)
    : undefined;
  const endT = props.endsWithDate
    ? new Date(props.endsWithDate).setHours(0, 0, 0, 0)
    : undefined;
  const starts =
    startT !== undefined && endT !== undefined ? Math.min(startT, endT) : startT;
  const ends =
    startT !== undefined && endT !== undefined ? Math.max(startT, endT) : endT;

  const hoverT = new Date(state.willBeRangesEndsWith).setHours(0, 0, 0, 0);
  const startsBeforeSelect =
    startT !== undefined ? Math.min(startT, hoverT) : hoverT;
  const endsBeforeSelect =
    startT !== undefined ? Math.max(startT, hoverT) : hoverT;

  function generateDays(monthsDate: Date): (RangerCalendarDayData | string)[] {
    const monthsDateData = createDate({
      date: monthsDate,
      locale: props.locale,
    });
    const offset: string[] = Array(monthsDateData.firstMonthDate).fill("");
    const days: RangerCalendarDayData[] = Array.from(
      Array(monthsDateData.amountOfDaysInAMonth).keys()
    ).map((d) => {
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
      const daysName = daysFullDateWithTime.toLocaleString(props.locale, {
        weekday: "long",
      });

      const t = daysFullDate.setHours(0, 0, 0, 0);
      const isInRanges =
        starts !== undefined &&
        ends !== undefined &&
        t >= starts &&
        t <= ends;
      const isInRangesBeforeSelect =
        t >= startsBeforeSelect &&
        t <= endsBeforeSelect &&
        !props.endsWithDate;
      const isActive =
        monthsDateData.activeDate === daysFullDate.toLocaleDateString();
      const dayStr = daysFullDate.toLocaleDateString();
      const isSelected =
        (props.startsWithDate != null &&
          dayStr === new Date(props.startsWithDate).toLocaleDateString()) ||
        (props.endsWithDate != null &&
          dayStr === new Date(props.endsWithDate).toLocaleDateString());

      function changeDate() {
        if (props.endsWithDate) {
          props.onStartsWithDateChange(daysFullDate);
          props.onEndsWithDateChange(null);
        } else {
          if (props.startsWithDate) {
            props.onEndsWithDateChange(daysFullDate);
          } else {
            props.onStartsWithDateChange(daysFullDate);
          }
        }
      }

      return {
        dateSelectPropList: {
          onMouseEnter: () => onHoverChange(daysFullDate.getTime()),
          onMouseLeave: () => onHoverChange(0),
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

  const dateData = createDate({
    date: state.startsFrom,
    locale: props.locale,
  });

  const months: RangerCalendarMonthData[] = Array.from(
    Array(props.monthsNumberToDraw).keys()
  ).map((m) => {
    const monthsFullDate = new Date(
      dateData.yearNumber,
      dateData.monthsNumber + m - 1,
      dateData.daysNumber
    );
    return {
      monthsName: dateData.monthsName,
      days: generateDays(monthsFullDate),
      yearNumber: dateData.yearNumber,
      monthsNumber: dateData.monthsNumber,
    };
  });

  return { months };
}

export function rangerCalendarNavPrev(
  props: Pick<RangerCalendarCoreProps, "startsWithDate">,
  state: RangerCalendarState
): RangerCalendarState {
  const sf = new Date(state.startsFrom ?? props.startsWithDate ?? new Date());
  sf.setMonth(sf.getMonth() - 1);
  return { ...state, startsFrom: sf };
}

export function rangerCalendarNavNext(
  props: Pick<RangerCalendarCoreProps, "startsWithDate">,
  state: RangerCalendarState
): RangerCalendarState {
  const sf = new Date(state.startsFrom ?? props.startsWithDate ?? new Date());
  sf.setMonth(sf.getMonth() + 1);
  return { ...state, startsFrom: sf };
}
