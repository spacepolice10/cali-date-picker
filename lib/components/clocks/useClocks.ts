import { coerceToDate, createDate } from "../createDate";

export type useClocksType = {
  date: Date;
  onChange: (date: Date) => void;
  locale?: string;
  timezone?: string;
};

export type useClocksReturnType = {
  date?: Date;
  hourList: generateTimeListReturnType;
  minuteList: generateTimeListReturnType;
  secondList: generateTimeListReturnType;
};

export type generateTimeListReturnType = {
  number: string;
  isSelected: boolean;
  selectTime: () => void;
  timeSelectPropList: {
    onClick: () => void;
    key: string;
  };
}[];

export const useClocks = (propList?: useClocksType): useClocksReturnType => {
  const date = createDate({
    date: coerceToDate(propList?.date),
    locale: propList?.locale,
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
    propList?.onChange(updateDate);
  }

  function generateTimeUnitList(
    count: number,
    currentValue: number,
    timeKey: "hour" | "minute" | "second"
  ): generateTimeListReturnType {
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
    date: coerceToDate(propList?.date),
    hourList: generateTimeUnitList(24, date.hourNumber, "hour"),
    minuteList: generateTimeUnitList(60, date.minuteNumber, "minute"),
    secondList: generateTimeUnitList(60, date.secondNumber, "second"),
  };
};
