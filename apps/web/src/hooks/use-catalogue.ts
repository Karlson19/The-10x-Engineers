"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateServiceCatalogItem, UpdateServiceCatalogItem } from "@chrysmec/shared";
import {
  createCatalogueItem,
  fetchManagedCatalogue,
  retireCatalogueItem,
  updateCatalogueItem,
} from "@/lib/api/catalogue";

export const CATALOGUE_KEY = ["catalogue"] as const;

export function useManagedCatalogue() {
  return useQuery({
    queryKey: [...CATALOGUE_KEY, "managed"] as const,
    queryFn: () => fetchManagedCatalogue(),
  });
}

export function useCreateCatalogueItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateServiceCatalogItem) => createCatalogueItem(input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: CATALOGUE_KEY });
    },
  });
}

export function useUpdateCatalogueItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateServiceCatalogItem }) =>
      updateCatalogueItem(id, input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: CATALOGUE_KEY });
    },
  });
}

export function useRetireCatalogueItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => retireCatalogueItem(id),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: CATALOGUE_KEY });
    },
  });
}
