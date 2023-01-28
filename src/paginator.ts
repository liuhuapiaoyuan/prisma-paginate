import { PrismaClient } from "@prisma/client";

/**
 * @example
 * // on database = [ { id: 1 }, { id: 2 }, {...}, { id: 100 } ]
 * paginator(prisma.myTable)(
 *   {
 *     where: {
 *       // query stuff...
 *     },
 *   },
 *   { page: 1, limit: 50 }
 * ).then((query) => {
 *   query.result; // return [ {...}, { id: 48 }, { id: 49 }, { id: 50 } ]
 * });
 */
export function paginator(): paginator.PrismaClientPaginate;
export function paginator(client: PrismaClient): paginator.PrismaClientPaginate;
export function paginator<Model extends paginator.PrismaModel>(
  model: Model
): paginator.PaginationParameters<Model>;
export function paginator<Model extends paginator.PrismaModel>(
  model: Model,
  options: Partial<paginator.PaginationOptions>
): paginator.PaginationParameters<Model>;
export function paginator<Model extends paginator.PrismaModel>(
  modelOrClient?: Model | PrismaClient,
  options?: Partial<paginator.PaginationOptions>
) {
  // Fix undefined class bug
  // @ts-ignore
  const p = new paginator.Paginate(modelOrClient, options);

  return modelOrClient
    ? "findMany" in modelOrClient
      ? paginator.Paginate.prototype.pagination.bind(p)
      : paginator.paginateClient(modelOrClient)
    : paginator.paginateClient();
}

export namespace paginator {
  export interface PrismaModel {
    findMany(...args: any[]): Promise<any>;
    count(...args: any[]): Promise<number>;
  }

  export type PrismaModelFindManyArguments<Model extends PrismaModel> =
    Parameters<Model["findMany"]>[0];

  export interface PaginationArguments extends Partial<PaginationOptions> {
    /**
     * Paginate starting from 1
     *
     * If enabled it overwrite 'pageIndex'
     *
     * @see {@link PaginationArguments.pageIndex}
     * @default 1
     */
    page?: number;
    /**
     * Paginate like index staring from 0
     *
     * @see {@link PaginationArguments.page}
     * @default 0
     */
    pageIndex?: number;
    /**
     * Limit how much rows to return
     */
    limit: number;
  }

  export interface PaginationOptions {
    /**
     * Throw error if options is greater than count
     * @see {@link ExceedCount}
     * @default false
     */
    exceedCount: boolean;
  }

  export interface Pagination<Model extends PrismaModel>
    extends PaginationArguments {
    /**
     * Total of pages based on pagination arguments
     */
    totalPages: number;
    /**
     * If has result on next page index
     */
    hasNextPage: boolean;
    /**
     * Request next page
     * @example
     * paginator(prisma)
     *   .myTable.paginate({}, { page: 1, limit: 10 })
     *   .then((result) => {
     *     result.nextPage((error, nextResult) => {
     *       // result?.nextPage(...)
     *     });
     *   });
     */
    nextPage: NextPage<Model, PaginationResult<Model>>;
    /**
     * If has result on last page index
     */
    hasPrevPage: boolean;
    /**
     * Count how many rows on has on table/model with query filter
     */
    count: number;
  }

  export type WithoutPaginationResult<Model extends PrismaModel> = Awaited<
    ReturnType<Model["findMany"]>
  >;

  export interface PaginationResult<Model extends PrismaModel>
    extends Pagination<Model> {
    result: WithoutPaginationResult<Model>;
  }

  export interface NextPage<
    Model extends PrismaModel,
    Result extends PaginationResult<Model>["result"] | PaginationResult<Model>
  > {
    (
      callback:
        | Promise<PaginationCallback<Model, Result>>
        | PaginationCallback<Model, Result>
    ): void;
  }

  export interface PaginationCallback<
    Model extends PrismaModel,
    Result extends PaginationResult<Model>["result"] | PaginationResult<Model>
  > {
    (error: Error | null, result?: Result): void;
  }

  export interface PaginationParameters<Model extends PrismaModel> {
    (
      findManyArgs: PrismaModelFindManyArguments<Model>,
      pagination: PaginationArguments,
      callback: PaginationCallback<Model, PaginationResult<Model>>
    ): void;
    (
      findManyArgs: PrismaModelFindManyArguments<Model>,
      callback: PaginationCallback<Model, WithoutPaginationResult<Model>>
    ): void;
    (
      findManyArgs: PrismaModelFindManyArguments<Model>,
      pagination: PaginationArguments
    ): Promise<PaginationResult<Model>>;
    (findManyArgs: PrismaModelFindManyArguments<Model>): Promise<
      WithoutPaginationResult<Model>
    >;
  }

  export class ExceedCount extends Error {
    constructor(public pagination: Pagination<any>) {
      super("Pagination options exceed count of rows");
    }
  }

  /**
   * @private
   */
  export class Paginate<Model extends PrismaModel> {
    constructor(
      private model: Model,
      private options?: Partial<PaginationOptions>
    ) {}

    pagination(
      findManyArgs: PrismaModelFindManyArguments<Model>,
      paginationOrCallback?:
        | PaginationArguments
        | PaginationCallback<Model, WithoutPaginationResult<Model>>,
      callback?: PaginationCallback<Model, PaginationResult<Model>>
    ) {
      const result = new Promise<
        WithoutPaginationResult<Model> | PaginationResult<Model>
      >((resolve, reject) => {
        if (typeof paginationOrCallback === "object") {
          this.model.count(findManyArgs).then((count) => {
            this.model
              .findMany(this.arguments(findManyArgs, paginationOrCallback))
              .then((result) =>
                this.result(findManyArgs, paginationOrCallback, count, result)
              )
              .then(resolve);
          }, reject);
        } else {
          this.model.findMany(findManyArgs).then(resolve);
        }
      });

      result.then(
        (value) => {
          if (callback) {
            callback(null, value);
          } else if (typeof paginationOrCallback === "function") {
            paginationOrCallback(null, value as WithoutPaginationResult<Model>);
          } else {
            return value;
          }
        },
        (reason) => {
          if (callback) {
            callback(reason);
          } else if (typeof paginationOrCallback === "function") {
            paginationOrCallback(reason);
          } else {
            throw reason;
          }
        }
      );

      if (!(callback || typeof paginationOrCallback === "function")) {
        return result;
      }
    }

    nextPage<
      Result extends PaginationResult<Model>["result"] | PaginationResult<Model>
    >(
      findManyArgs: PrismaModelFindManyArguments<Model>,
      paginationArgs: PaginationArguments
    ): NextPage<Model, Result> {
      paginationArgs = {
        ...paginationArgs,
        page: (paginationArgs.page || 0) + 1,
        pageIndex:
          typeof paginationArgs.page === "number"
            ? undefined
            : (paginationArgs.pageIndex || 0) + 1,
      };

      return (callback) => {
        this.pagination(findManyArgs, paginationArgs, (error, result) => {
          if (callback instanceof Promise) {
            callback.then((callback) => {
              callback(error, result as Result);
            });
          } else {
            callback(error, result as Result);
          }
        });
      };
    }

    arguments(
      findManyArgs: PrismaModelFindManyArguments<Model>,
      paginationArgs: PaginationArguments
    ): PrismaModelFindManyArguments<Model> {
      return {
        ...findManyArgs,
        take: paginationArgs.limit,
        skip:
          paginationArgs.limit *
          (typeof paginationArgs.page === "number"
            ? paginationArgs.page > 0
              ? paginationArgs.page - 1
              : paginationArgs.page
            : typeof paginationArgs.pageIndex === "number"
            ? paginationArgs.pageIndex
            : 0),
      };
    }

    result(
      findManyArgs: PrismaModelFindManyArguments<Model>,
      paginationArgs: PaginationArguments,
      count: number,
      findManyReturn: WithoutPaginationResult<Model>
    ): PaginationResult<Model> {
      const totalPages = Math.round(count / paginationArgs.limit);
      const page =
        typeof paginationArgs.page === "number"
          ? paginationArgs.page === 0
            ? 1
            : paginationArgs.page
          : typeof paginationArgs.pageIndex === "number"
          ? paginationArgs.pageIndex + 1
          : 1;
      const hasNextPage = page < totalPages;
      const hasPrevPage =
        count > 0
          ? (page * paginationArgs.limit) / count - 1 === 0 ||
            page - 1 === totalPages
          : false;
      const pagination: Pagination<Model> = {
        limit: paginationArgs.limit,
        nextPage: this.nextPage(findManyArgs, paginationArgs),
        count,
        totalPages,
        hasNextPage,
        hasPrevPage,
        page,
      };

      if (
        (paginationArgs.exceedCount === true || this.options?.exceedCount) &&
        paginationArgs.limit * page > count
      ) {
        throw new ExceedCount(pagination);
      } else {
        return { ...pagination, result: findManyReturn };
      }
    }
  }

  type PrismaClientPaginateModels = Omit<
    typeof PrismaClient.prototype,
    | "$executeRaw"
    | "$disconnect"
    | "$on"
    | "$connect"
    | "$executeRawUnsafe"
    | "$queryRaw"
    | "$queryRawUnsafe"
    | "$use"
    | "$transaction"
  >;

  export type PrismaClientPaginate = {
    [K in keyof PrismaClientPaginateModels]: PrismaClientPaginateModels[K] & {
      paginate: PaginationParameters<typeof PrismaClient.prototype[K]>;
    };
  };

  /**
   * @example
   * paginateClient().myTable.paginate({ where: {} }, { limit: 10, page: 1 })
   */
  export function paginateClient(): PrismaClientPaginate;
  /**
   * @example
   * const client = new PrismaClient()
   * paginateClient(client).myTable.paginate({ where: {} }, { limit: 10, page: 1 })
   */
  export function paginateClient(client: PrismaClient): PrismaClientPaginate;
  export function paginateClient(client?: PrismaClient): PrismaClientPaginate {
    const paginateClient = (client
      ? client
      : new PrismaClient()) as unknown as PrismaClientPaginate;

    for (const ok of Object.keys(paginateClient) as Array<
      keyof typeof paginateClient
    >) {
      if (typeof paginateClient[ok]?.findMany === "function") {
        paginateClient[ok].paginate = paginator(paginateClient[ok]);
      }
    }

    return paginateClient;
  }
}
