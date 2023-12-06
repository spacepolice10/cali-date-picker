import { useState } from "react";
import { createDate } from "../createDate";

/**
 * @property {date} — date object or date-compatible string to work with
 * @property {onChange} — callback that returns date selected inside calendar
 * @property {startsFromDate} — date that will be used as a starting point to draw calendar from. If chosen July of 2002, even though `date` is May of 2020, `useCalendar` will return days of July 2002
 * @property {monthsNumberToDraw} — amount of months to return from hook. It might be useful when showing a lof of months is necessary (e.g. for building full-fledged calendars)
 * @property {locale} — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#locales
 * @property {timezone} — https://www.iana.org/time-zones
 */
export type useCalendarType = {
	date: Date | string;
	onChange: (date: Date) => void;
	startsFromDate?: Date | string;
	monthsNumberToDraw?: number;
	locale?: string;
	timezone?: string;
};

export type useCalendarReturnType = {
	date: Date;
	listOfMonths: generateListOfMonthsType;
	selectPrev: () => void;
	selectNext: () => void;
};

export type generateListOfMonthsType = {
	name: string;
	days: generateListOfDaysInAMonthWithOffsetType;
	yearNumber: number;
	monthsNumber: number;
}[];

export type generateListOfDaysInAMonthWithOffsetType = {
	daysNumber: number;
	daysName: string;
	isActive: boolean;
	isSelected: boolean;
	selectDate: () => void;
}[];

export const useCalendar = (propList: useCalendarType) => {
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

	function generateListOfMonths(): generateListOfMonthsType {
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
				generateListOfDaysInAMonthWithOffset(monthsFullDate);
			return {
				name: dateData.monthsName,
				days,
				yearNumber: dateData.yearNumber,
				monthsNumber: dateData.monthsNumber,
			};
		});
	}
	function generateListOfDaysInAMonthWithOffset(
		monthsDate: Date
	): generateListOfDaysInAMonthWithOffsetType {
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

			const isActive =
				monthsDateData.activeDate == daysFullDate;
			const isSelected =
				new Date(propList.date).toLocaleDateString() ==
				daysFullDate;

			function selectDate() {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-expect-error
				document.forms["dateform"].reset();
				propList?.onChange(daysFullDateWithTime);
			}
			return {
				daysNumber,
				daysName,
				isActive,
				isSelected,
				selectDate,
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
		listOfMonths: generateListOfMonths(),
		selectPrev,
		selectNext,
	};
};
