import { coerceToDate } from "./createDate";

export type RangerClocksCoreProps = {
  startsWithDate?: Date | null;
  endsWithDate?: Date | null;
  startsFromDate?: Date | null;
  locale?: string;
  timezone?: string;
  onStartsWithDateChange: (date: Date | string | null) => void;
  onEndsWithDateChange: (date: Date | string | null) => void;
};

export type RangerClocksState = {
  startsFrom: Date | undefined;
  willBeRangesEndsWith: number;
};

export type RangerClocksTimeSlot = {
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
};

export function getRangerClocksInitialState(
  props: Pick<RangerClocksCoreProps, "startsFromDate">
): RangerClocksState {
  return {
    startsFrom: coerceToDate(props.startsFromDate ?? undefined),
    willBeRangesEndsWith: 0,
  };
}

export function computeRangerClocks(
  props: RangerClocksCoreProps,
  state: RangerClocksState,
  onHoverChange: (timestamp: number) => void
): { combinedData: string; time: RangerClocksTimeSlot[][] } {
  const startT = props.startsWithDate
    ? new Date(props.startsWithDate).getTime()
    : undefined;
  const endT = props.endsWithDate
    ? new Date(props.endsWithDate).getTime()
    : undefined;
  const starts =
    startT !== undefined && endT !== undefined ? Math.min(startT, endT) : startT;
  const ends =
    startT !== undefined && endT !== undefined ? Math.max(startT, endT) : endT;

  const hoverT = new Date(state.willBeRangesEndsWith).getTime();
  const startsBeforeSelect =
    startT !== undefined ? Math.min(startT, hoverT) : hoverT;
  const endsBeforeSelect =
    startT !== undefined ? Math.max(startT, hoverT) : hoverT;

  const timeList: RangerClocksTimeSlot[][] = [];
  for (let hour = 0; hour < 24; hour++) {
    const row = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((mi) => {
      const base = state.startsFrom ?? new Date();
      const date = new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        hour,
        mi
      );
      const minute = date.toLocaleTimeString(props.locale, {
        hour: "2-digit",
        minute: "2-digit",
      });

      const isInRanges =
        starts !== undefined &&
        ends !== undefined &&
        date.getTime() >= starts &&
        date.getTime() <= ends;
      const isInRangesBeforeSelect =
        date.getTime() >= startsBeforeSelect &&
        date.getTime() <= endsBeforeSelect &&
        !props.endsWithDate;

      function changeTime() {
        if (props.endsWithDate) {
          props.onStartsWithDateChange(date);
          props.onEndsWithDateChange(null);
        } else {
          if (props.startsWithDate) {
            props.onEndsWithDateChange(date);
          } else {
            props.onStartsWithDateChange(date);
          }
        }
      }

      const isActive =
        date.toLocaleDateString() === new Date().toLocaleDateString();
      const isSelected =
        (props.startsWithDate != null &&
          date.getTime() === new Date(props.startsWithDate).getTime()) ||
        (props.endsWithDate != null &&
          date.getTime() === new Date(props.endsWithDate).getTime());

      return {
        isActive,
        isSelected,
        isInRanges,
        isInRangesBeforeSelect,
        date,
        minute,
        timeSelectPropList: {
          onMouseEnter: () => onHoverChange(date.getTime()),
          onMouseLeave: () => onHoverChange(0),
          onClick: changeTime,
          key: `${new Date(date).getTime()}`,
        },
      };
    });
    timeList.push(row);
  }

  const combinedData =
    props.startsWithDate != null && props.endsWithDate != null
      ? [
          new Date(
            Math.min(
              new Date(props.startsWithDate).getTime(),
              new Date(props.endsWithDate).getTime()
            )
          ).toLocaleTimeString(props.locale),
          new Date(
            Math.max(
              new Date(props.startsWithDate).getTime(),
              new Date(props.endsWithDate).getTime()
            )
          ).toLocaleTimeString(props.locale),
        ].join(" ")
      : "";

  return { combinedData, time: timeList };
}

export function rangerClocksNavPrev(state: RangerClocksState): RangerClocksState {
  const sf = new Date(state.startsFrom ?? new Date());
  sf.setDate(sf.getDate() - 1);
  return { ...state, startsFrom: sf };
}

export function rangerClocksNavNext(state: RangerClocksState): RangerClocksState {
  const sf = new Date(state.startsFrom ?? new Date());
  sf.setDate(sf.getDate() + 1);
  return { ...state, startsFrom: sf };
}
