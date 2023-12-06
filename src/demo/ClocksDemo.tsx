import { Dispatch, SetStateAction } from "react";
import { Clocks } from "../../lib/components/clocks/Clocks";

export const ClocksDemo = ({
	date,
	setDate,
}: {
	date: Date;
	setDate: Dispatch<SetStateAction<Date>>;
}) => {
	const BlocksStyles =
		"flex w-16 items-center flex-col gap-2 h-80 overflow-y-scroll border";
	const ButtonStyles = (isSelected: boolean) => {
		return `h-10 w-10 font-mono rounded-full font-bold p-2 ${
			isSelected && "bg-pink-400 text-white"
		}`;
	};
	return (
		<Clocks
			date={date}
			onChange={(date: Date) => {
				console.log(date);
				setDate(date);
			}}
			className="mt-10"
		>
			{({ hourList, minuteList, secondList }) => (
				<div className="flex gap-2">
					<div className={BlocksStyles}>
						{hourList.map(
							({ number, select, isSelected }) => (
								<button
									onClick={() => select()}
									className={ButtonStyles(isSelected)}
								>
									{number}
								</button>
							)
						)}
					</div>
					<div className={BlocksStyles}>
						{minuteList.map(
							({ number, select, isSelected }) => (
								<button
									onClick={() => select()}
									className={ButtonStyles(isSelected)}
								>
									{number}
								</button>
							)
						)}
					</div>
					<div className={BlocksStyles}>
						{secondList.map(
							({ number, select, isSelected }) => (
								<button
									onClick={() => select()}
									className={ButtonStyles(isSelected)}
								>
									{number}
								</button>
							)
						)}
					</div>
				</div>
			)}
		</Clocks>
	);
};
