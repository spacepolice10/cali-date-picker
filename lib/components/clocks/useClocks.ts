import { createDate } from "../createDate";

export type useClocksType = {
	date: Date;
	onChange: (date: Date) => void;
	locale?: string;
	timezone?: string;
};

export type useClocksReturnType = {
	hourList: generateTimeListReturnType;
	minuteList: generateTimeListReturnType;
	secondList: generateTimeListReturnType;
};

export type generateTimeListReturnType = {
	number: string;
	isSelected: boolean;
	select: () => void;
}[];

export const useClocks = (
	propList?: useClocksType
): useClocksReturnType => {
	const date = createDate({
		date:
			typeof propList?.date == "string"
				? new Date(propList?.date)
				: propList?.date,
		locale: propList?.locale,
	});

	function changeTime(args: {
		hour?: number;
		minute?: number;
		second?: number;
	}) {
		const updateDate = new Date(
			date.yearNumber,
			date.monthsNumber - 1,
			date.daysNumber,
			args.hour ? args.hour + 1 : date.hourNumber,
			args.minute ?? date.minuteNumber,
			args.second ?? date.secondNumber
		);
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		document.forms["timeform"].reset();
		propList?.onChange(updateDate);
	}
	function generateHourList() {
		return [...Array(24).keys()].map((hour) => {
			const isSelected = hour + 1 == date.hourNumber;
			function selectHour() {
				changeTime({ hour });
			}
			return {
				number:
					hour != 23
						? `${hour + 1}`.padStart(2, "0")
						: `${0}`.padStart(2, "0"),
				isSelected,
				select: selectHour,
			};
		});
	}
	function generateMinuteList() {
		return [...Array(61).keys()].map((minute) => {
			const isSelected = minute == date.minuteNumber;
			function selectMinute() {
				changeTime({ minute });
			}
			return {
				number: `${minute}`.padStart(2, "0"),
				isSelected,
				select: selectMinute,
			};
		});
	}
	function generateSecondList() {
		return [...Array(61).keys()].map((second) => {
			const isSelected = second == date.secondNumber;
			function selectSecond() {
				changeTime({ second });
			}
			return {
				number: `${second}`.padStart(2, "0"),
				isSelected,
				select: selectSecond,
			};
		});
	}

	return {
		hourList: generateHourList(),
		minuteList: generateMinuteList(),
		secondList: generateSecondList(),
	};
};
