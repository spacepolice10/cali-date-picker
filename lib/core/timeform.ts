import { coerceToDate, createDate } from "./createDate";
import type { InputChangeEvent } from "./dateform";

export type TimeformCoreProps = {
  date: Date;
  onChange: (date: Date) => void;
  locale?: string;
  timezone?: string;
};

export type TimeformInputProps = {
  onChange: (ev: InputChangeEvent) => void;
  defaultValue?: string;
  type?: "number";
  maxLength: number;
};

export type TimeformCoreResult = {
  hourFormPropList: TimeformInputProps;
  minuteFormPropList: TimeformInputProps;
  secondFormPropList: TimeformInputProps;
};

export function computeTimeform(props: TimeformCoreProps): TimeformCoreResult {
  const date = createDate({
    date: coerceToDate(props.date),
    locale: props.locale,
  });

  function changeTime(args: {
    hourNumber?: number;
    minuteNumber?: number;
    secondNumber?: number;
  }) {
    const updateDate = new Date(
      date.yearNumber,
      date.monthsNumber - 1,
      date.daysNumber,
      args.hourNumber != undefined ? args.hourNumber : date.hourNumber,
      args.minuteNumber ?? date.minuteNumber,
      args.secondNumber ?? date.secondNumber
    );
    props.onChange(updateDate);
  }

  function updateHour(ev: InputChangeEvent) {
    const hour = ev.target.value;
    const maxVal = 23;
    if (+hour === 0) { changeTime({ hourNumber: 0 }); return; }
    changeTime({ hourNumber: +hour > maxVal ? maxVal : +hour });
  }

  function updateMinute(ev: InputChangeEvent) {
    const minute = ev.target.value;
    const maxVal = 59;
    if (+minute <= 0) return;
    changeTime({ minuteNumber: +minute > maxVal ? maxVal : +minute });
  }

  function updateSecond(ev: InputChangeEvent) {
    const second = ev.target.value;
    const maxVal = 59;
    if (+second <= 0) return;
    changeTime({ secondNumber: +second > maxVal ? maxVal : +second });
  }

  return {
    hourFormPropList: {
      onChange: updateHour,
      defaultValue: `${date.hourNumber}`,
      maxLength: 2,
    },
    minuteFormPropList: {
      onChange: updateMinute,
      defaultValue: `${date.minuteNumber}`,
      maxLength: 2,
    },
    secondFormPropList: {
      onChange: updateSecond,
      defaultValue: `${date.secondNumber}`,
      maxLength: 2,
    },
  };
}

export type { InputChangeEvent } from "./dateform";
