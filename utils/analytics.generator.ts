import { Document, Model } from "mongoose";


interface MonthData{
    month: string;
    count: number;


}

export async function generateLast12MonthsData<T extends Document>(
    model:Model<T>
):Promise<{last12Months: MonthData[]}>{
    const last12Months: MonthData[] = [];
    const currentDate = new Date();

    const adjustMonth = (date: Date, monthOffset: number) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + monthOffset, 1);
    };

    for (let i = 11; i >= 0; i--) {
        const startDate = adjustMonth(currentDate, -i);
        const endDate = adjustMonth(currentDate, -i + 1);

        const month = `${startDate.toLocaleDateString("default", {
            month: "short",
            year: "numeric",
            day: "2-digit"
        })} - ${endDate.toLocaleDateString("default", {
            month: "short",
            year: "numeric",
            day: "2-digit"
        })}`;
        const newMonth = `${startDate.toLocaleDateString("default", {
            month: "short",
            year: "numeric",
            day: "2-digit"
        })}`;

        const count = await model.countDocuments({
            createdAt: {
                $gte: startDate,
                $lt: endDate,
            },
        });

        last12Months.push({ month: newMonth, count });
    }

    return { last12Months };
}