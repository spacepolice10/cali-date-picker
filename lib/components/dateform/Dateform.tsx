import { ReactNode } from "react";
import {
	useDateform,
	useDateformReturnType,
	useDateformType,
} from "./useDateform";

type DateformType = useDateformType & {
	children?: (args: useDateformReturnType) => ReactNode;
	className?: string;
};

export const Dateform = (propList: DateformType) => {
	const { children, className } = propList;
	const formPropList = useDateform(propList);
	return (
		<form
			id="dateform"
			aria-describedby="dateform"
			className={className}
		>
			{children?.({
				...formPropList,
			})}
		</form>
	);
};
