import { ExceedCount, ExceedTotalPages } from "./pagination";
import type { NextPage, Pagination, PaginationArgs } from "./pagination";

type PageArgs = Partial<Pick<PaginationArgs, "page" | "pageIndex">>;

export interface IPaginationResult<Result = unknown>
  extends Required<Pagination> {
  result: Result;
  nextPage: NextPage<Result>;
}

export class PaginationResult<Result> implements IPaginationResult<Result> {
  public readonly page: number = 1;

  public constructor(
    public readonly count: number,
    page: PageArgs,
    public readonly limit: number,
    public readonly exceedCount: boolean = false,
    public readonly exceedTotalPages: boolean = false,
    public readonly result: Result,
    public readonly nextPage: NextPage<Result>
  ) {
    this.page = PaginationResult.pageInit(page);
    this.validateExceedTotalPages();
    this.validateExceedCount();
  }

  public get hasNextPage(): boolean {
    return this.page < this.totalPages;
  }

  public get hasPrevPage(): boolean {
    return this.count > 0 && this.page > 1 && this.page <= this.totalPages + 1;
  }

  public get totalPages(): number {
    return Math.ceil(this.count / this.limit);
  }

  public static pageInit({ page, pageIndex }: PageArgs): number {
    return typeof page === "number"
      ? page === 0
        ? 1
        : page
      : typeof pageIndex === "number"
      ? pageIndex + 1
      : 1;
  }

  public validateExceedTotalPages(): void {
    if (this.exceedTotalPages && this.page > this.totalPages)
      throw new ExceedTotalPages(this);
  }

  public validateExceedCount(): void {
    if (this.exceedCount && this.limit * this.page > this.count)
      throw new ExceedCount(this);
  }

  public static extractCount(count: any): number {
    return typeof count === "number"
      ? count
      : count?._all || count?._count || NaN;
  }

  public static nextPageArgs(args: PaginationArgs): PaginationArgs {
    return {
      ...args,
      page: (args.page || 0) + 1,
      pageIndex:
        typeof args.page === "number" ? undefined : (args.pageIndex || 0) + 1,
    };
  }

  public static pageOffset(
    limit: number,
    { page, pageIndex }: PageArgs
  ): number {
    return (
      limit *
      (typeof page === "number"
        ? page > 0
          ? page - 1
          : page
        : typeof pageIndex === "number"
        ? pageIndex
        : 0)
    );
  }
}
