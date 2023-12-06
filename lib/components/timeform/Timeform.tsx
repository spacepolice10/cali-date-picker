import { ReactNode } from "react";
import {
	useTimeform,
	useTimeformReturnType,
	useTimeformType,
} from "./useTimeform";

type TimeformType = useTimeformType & {
	children?: (args: useTimeformReturnType) => ReactNode;
	className?: string;
};

export const Timeform = (propList: TimeformType) => {
	const { children, className } = propList;
	const formPropList = useTimeform(propList);
	return (
		<form
			id="timeform"
			aria-describedby="timeform"
			className={className}
		>
			{children?.({
				...formPropList,
			})}
		</form>
	);
};
