import { Dispatch, SetStateAction } from "react";
import { Calendar } from "../../lib/main";

export const CalendarDemo = ({
	date,
	setDate,
}: {
	date: Date;
	setDate: Dispatch<SetStateAction<Date>>;
}) => {
	return (
		<>
			<Calendar
				date={date}
				onChange={(date) => {
					console.log(date);
					setDate(date);
				}}
			>
				{({ listOfMonths, selectPrev, selectNext }) => (
					<div>
						<div className="flex gap-4 py-2 border-b">
							<button
								onClick={selectPrev}
								className="font-mono text-xs hover:bg-gray-100 p-4"
							>
								prev
							</button>
							<button
								onClick={selectNext}
								className="font-mono text-xs hover:bg-gray-100 p-4"
							>
								next
							</button>
						</div>
						<div className="grid w-80 gap-2 px-2 grid-cols-7">
							{["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map(
								(d) => (
									<p className="h-10 w-10 font-mono text-gray-400 flex justify-center items-center p-2">
										{d}
									</p>
								)
							)}
						</div>
						{listOfMonths.map((m) => {
							return (
								<>
									<div className="px-2 grid w-80 grid-cols-7 gap-2">
										{m.days.map((d) => (
											<button
												key={d.daysNumber}
												onClick={() => d.selectDate()}
												className={`h-10 w-10 font-mono font-bold duration-75 p-2 rounded-sm  
                                                ${
																									d.isActive &&
																									"bg-pink-200"
																								}
                                                ${
																									d.isSelected &&
																									"bg-sky-200 shadow-lg"
																								}
                                                `}
											>
												{d.daysNumber}
											</button>
										))}
									</div>
								</>
							);
						})}
					</div>
				)}
			</Calendar>
		</>
	);
};
