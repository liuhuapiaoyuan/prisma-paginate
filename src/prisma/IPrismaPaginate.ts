import { PrismaFindManyArgs } from "./PrismaFindManyArgs";
import { PrismaPaginateResult2 } from "./PrismaPaginateResult";
import { PrismaPaginationArgs } from "./PrismaPaginationArgs";

export interface IPrismaPaginate {
	name: "prisma-paginate";
	model: {
		$allModels: {
			paginate<Model, Args>(
				this: Model,
				args: PrismaFindManyArgs<Model, Args> & PrismaPaginationArgs,
			): PrismaPaginateResult2<Model, Args>;
			paginate<Model, Args>(
				this: Model,
				args: PrismaFindManyArgs<Model, Args>,
				paginationArgs: PrismaPaginationArgs,
			): PrismaPaginateResult2<Model, Args>;
		};
	};
}
