import { coerceToDate, createDate } from "./createDate";

export type ClocksCoreProps = {
  date: Date;
  onChange: (date: Date) => void;
  locale?: string;
  timezone?: string;
};

export type ClocksTimeItem = {
  number: string;
  isSelected: boolean;
  selectTime: () => void;
  timeSelectPropList: {
    onClick: () => void;
    key: string;
  };
};

export function computeClocks(props: ClocksCoreProps): {
  date: Date | undefined;
  hourList: ClocksTimeItem[];
  minuteList: ClocksTimeItem[];
  secondList: ClocksTimeItem[];
} {
  const date = createDate({
    date: coerceToDate(props.date),
    locale: props.locale,
  });

  function changeTime(args: { hour?: number; minute?: number; second?: number }) {
    const updateDate = new Date(
      date.yearNumber,
      date.monthsNumber - 1,
      date.daysNumber,
      args.hour != undefined ? args.hour : date.hourNumber,
      args.minute ?? date.minuteNumber,
      args.second ?? date.secondNumber
    );
    props.onChange(updateDate);
  }

  function generateTimeUnitList(
    count: number,
    currentValue: number,
    timeKey: "hour" | "minute" | "second"
  ): ClocksTimeItem[] {
    return [...Array(count).keys()].map((value) => {
      function selectTime() {
        changeTime({ [timeKey]: value });
      }
      return {
        number: `${value}`.padStart(2, "0"),
        isSelected: value === currentValue,
        selectTime,
        timeSelectPropList: {
          onClick: selectTime,
          key: `${value}`,
        },
      };
    });
  }

  return {
    date: coerceToDate(props.date),
    hourList: generateTimeUnitList(24, date.hourNumber, "hour"),
    minuteList: generateTimeUnitList(60, date.minuteNumber, "minute"),
    secondList: generateTimeUnitList(60, date.secondNumber, "second"),
  };
}
