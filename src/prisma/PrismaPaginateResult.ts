import { Prisma } from "@prisma/client";
import { PaginationResult, PaginationResult2 } from "../pagination/result/PaginationResult";

export type PrismaPaginateResult<Model, Args> = Promise<
	PaginationResult<Prisma.Result<Model, Args, "findMany">>
>;

export type PrismaPaginateResult2<Model, Args> = Promise<
	PaginationResult2<Prisma.Result<Model, Args, "findMany">>
>;
