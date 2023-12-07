import { useEffect, useState } from "react";
import { createDate } from "../createDate";

export type useRangesCalendarType = {
	date: Date | string;
	startsFromDate?: Date | string;
	monthsNumberToDraw?: number;
	locale?: string;
	timezone?: string;
	onChange: (args: {
		RangesBeginsWith: string;
		RangesEndsWith: string;
	}) => void;
};

export type useRangesCalendarReturnType = {
	date: Date;
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

export type overrideGenerateListOfDaysInAMonthWithOffsetType =
	{
		isActive: boolean;
		isSelected: boolean;
		isInRanges: boolean;
		isInRangesBeforeSelect: boolean;
		daysNumber: number;
		daysName: string;
		RangesDatePropList: {
			onMouseEnter: () => void;
			onMouseLeave: () => void;
			onClick: () => void;
		};
	}[];

export const useRangesCalendar = (
	propList: useRangesCalendarType
) => {
	const date = createDate({
		date:
			typeof propList.date == "string"
				? new Date(propList.date)
				: propList.date,
		locale: propList.locale,
	});
	const [startsFrom, changeStartsFrom] = useState(
		typeof propList.startsFromDate == "string"
			? new Date(propList.startsFromDate)
			: propList.startsFromDate
	);

	const [RangesBeginsWith, changeRangesBeginsWith] = useState<
		string | null
	>(null);
	const [RangesEndsWith, changeRangesEndsWith] = useState<
		string | null
	>(null);
	const [willBeRangesEndsWith, changeWillBeRangesEndsWith] =
		useState<string | null>(null);

	useEffect(() => {
		if (!RangesBeginsWith || !RangesEndsWith) return;
		propList?.onChange({
			RangesBeginsWith,
			RangesEndsWith,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [RangesEndsWith]);

	function overrideGenerateListOfMonths(): overrideGenerateListOfMonthsType {
		const dateData = createDate({
			date: startsFrom,
			locale: propList.locale,
		});
		return Array.from(
			Array(propList.monthsNumberToDraw).keys()
		).map((m) => {
			const monthsFullDate = new Date(
				dateData.yearNumber,
				// compensate difference between number of months in JS & actual calendar
				dateData.monthsNumber + m - 1,
				dateData.daysNumber
			);
			const days =
				overrideGenerateListOfDaysInAMonthWithOffset(
					monthsFullDate
				);
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
		const offset = Array(monthsDateData.firstMonthDate).fill(
			""
		);
		const days = Array.from(
			Array(monthsDateData.amountOfDaysInAMonth).keys()
		).map((d) => {
			// compensate difference between number of months/days in JS & actual calendar
			const daysNumber = d + 2;
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
			const daysName = daysFullDateWithTime.toLocaleString(
				propList.locale,
				{
					weekday: "long",
				}
			);
			const [starts, ends] = [
				RangesBeginsWith,
				RangesEndsWith,
			].sort();
			const [startsBeforeSelect, endsBeforeSelect] = [
				RangesBeginsWith,
				willBeRangesEndsWith,
			].sort();
			const isInRanges =
				daysFullDate >= (starts ?? "") &&
				daysFullDate <= (ends ?? "");
			const isInRangesBeforeSelect =
				daysFullDate >= (startsBeforeSelect ?? "") &&
				daysFullDate <= (endsBeforeSelect ?? "") &&
				!RangesEndsWith;
			const isActive =
				monthsDateData.activeDate == daysFullDate;

			function changeDate() {
				if (RangesEndsWith) {
					changeRangesBeginsWith(daysFullDate);
					changeRangesEndsWith(null);
				} else {
					if (RangesBeginsWith) {
						changeRangesEndsWith(daysFullDate);
					} else {
						changeRangesBeginsWith(daysFullDate);
					}
				}
			}
			const RangesDatePropList = {
				onMouseEnter: () =>
					changeWillBeRangesEndsWith(daysFullDate),
				onMouseLeave: () => changeWillBeRangesEndsWith(null),
				onClick: changeDate,
			};
			return {
				RangesDatePropList,
				daysNumber,
				daysName,
				isActive,
				isInRanges,
				isInRangesBeforeSelect,
			};
		});
		return [...offset, ...days];
	}

	function selectPrev() {
		const sf = startsFrom ?? new Date();
		const updateDate = new Date(
			sf.setMonth(sf.getMonth() - 1)
		);
		changeStartsFrom(updateDate);
	}
	function selectNext() {
		const sf = startsFrom ?? new Date();
		const updateDate = new Date(
			sf.setMonth(sf.getMonth() + 1)
		);
		changeStartsFrom(updateDate);
	}

	return {
		date:
			typeof propList.date == "string"
				? new Date(propList.date)
				: propList.date,
		months: overrideGenerateListOfMonths(),
		selectPrev,
		selectNext,
	};
};
