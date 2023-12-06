import { Dispatch, SetStateAction } from "react";
import { Dateform } from "../../lib/components/dateform/Dateform";

export const DateformDemo = ({
	date,
	setDate,
}: {
	date: Date;
	setDate: Dispatch<SetStateAction<Date>>;
}) => {
	const dateFormStyles = "w-20 px-4 outline-none";
	return (
		<>
			<Dateform date={date} onChange={setDate}>
				{({
					yearFormPropList,
					monthsFormPropList,
					daysFormPropList,
				}) => (
					<div>
						<input
							{...yearFormPropList}
							className={dateFormStyles}
						/>
						{"/"}
						<input
							{...monthsFormPropList}
							className={dateFormStyles}
						/>
						{"/"}
						<input
							{...daysFormPropList}
							className={dateFormStyles}
						/>
					</div>
				)}
			</Dateform>
		</>
	);
};
