import { createCollection, BasicIndex } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { rpc } from "@/lib/rpc";
import { queryClient } from "@/lib/query-client";
import type { PiAvailableModel } from "@pixxl/shared";

export function getModelsCollection() {
  const collection = createCollection(
    queryCollectionOptions({
      queryClient,
      queryKey: ["models"],
      getKey: (item: PiAvailableModel) => item.fullId,
      queryFn: () => rpc.agent.listAvailableModels() as Promise<PiAvailableModel[]>,
      staleTime: Infinity,
    }),
  );

  collection.createIndex((item) => item.provider, { indexType: BasicIndex });
  collection.createIndex((item) => item.name, { indexType: BasicIndex });

  return collection;
}
