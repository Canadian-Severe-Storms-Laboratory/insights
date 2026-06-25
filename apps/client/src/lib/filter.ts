import { z } from "zod";


const ProductSchema = z.object({
    id:z.uuid(),
    name: z.string(),
    createdAt: z.string(),
    createdBy: z.string()
});

const FilterSchema = z.object({
    searchString:z.string(),
    startDate: z.date().optional().default(new Date('1900-01-01')),
    endDate: z.date().optional().default(new Date()),
    uploader: z.string()
});

type productDataArray = z.infer<typeof ProductSchema>;


export function CardFilter( dataArray :productDataArray[], filterValues: any, userId:string = ''){

    const menuFilter = FilterSchema.parse(filterValues);

    const parsedData = z.array(ProductSchema).parse(dataArray);
    
    const filteredData = parsedData.filter((data) =>{
        const SearchStringCheck = data.name.includes(menuFilter.searchString);
        const DateCheck = new Date(data.createdAt) >= menuFilter.startDate && new Date(data.createdAt) <= menuFilter.endDate;
        const UserCheck = menuFilter.uploader === 'anyone' ||  data.createdBy === userId

        return SearchStringCheck && DateCheck && UserCheck;

    });

    const filteredId = filteredData.map(data => data.id);

    return dataArray.filter((data) => filteredId.includes(ProductSchema.parse(data).id));
}