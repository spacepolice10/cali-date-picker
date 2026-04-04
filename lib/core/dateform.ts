import { coerceToDate, createDate } from "./createDate";

export type DateformCoreProps = {
  date: Date;
  onChange: (date: Date) => void;
  locale?: string;
  timezone?: string;
};

/** Generic input-change event compatible with both DOM InputEvent and React SyntheticEvent. */
export type InputChangeEvent = { target: { value: string } };

export type DateformInputProps = {
  onChange: (ev: InputChangeEvent) => void;
  defaultValue?: string;
  type?: "number";
  maxLength: number;
};

export type DateformCoreResult = {
  daysFormPropList: DateformInputProps;
  monthsFormPropList: DateformInputProps;
  yearFormPropList: DateformInputProps;
};

export function computeDateform(props: DateformCoreProps): DateformCoreResult {
  const date = createDate({
    date: coerceToDate(props.date),
    locale: props.locale,
  });

  function changeDate(args: {
    daysNumber?: number;
    monthsNumber?: number;
    yearNumber?: number;
  }) {
    const monthsNumber1Based = args.monthsNumber ?? date.monthsNumber;
    const updateDate = new Date(
      args.yearNumber ?? date.yearNumber,
      monthsNumber1Based - 1,
      args.daysNumber ?? date.daysNumber,
      date.hourNumber,
      date.minuteNumber,
      date.secondNumber
    );
    props.onChange(updateDate);
  }

  function updateYear(ev: InputChangeEvent) {
    const year = ev.target.value;
    const maxVal = 9999;
    changeDate({ yearNumber: +year > maxVal ? maxVal : +year });
  }

  function updateDays(ev: InputChangeEvent) {
    const days = ev.target.value;
    const maxVal = date.amountOfDaysInAMonth;
    if (+days <= 0) return;
    changeDate({ daysNumber: +days > maxVal ? maxVal : +days });
  }

  function updateMonths(ev: InputChangeEvent) {
    const months = ev.target.value;
    const maxVal = 12;
    if (+months <= 0) return;
    changeDate({ monthsNumber: +months > maxVal ? maxVal : +months });
  }

  return {
    yearFormPropList: {
      onChange: updateYear,
      defaultValue: `${date.yearNumber}`,
      maxLength: 4,
    },
    daysFormPropList: {
      onChange: updateDays,
      defaultValue: `${date.daysNumber}`,
      maxLength: 2,
    },
    monthsFormPropList: {
      onChange: updateMonths,
      defaultValue: `${date.monthsNumber}`,
      maxLength: 2,
    },
  };
}
