import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import type { PiSettings, PiPartialSettings } from "@pixxl/shared/contracts/pi-settings";

export function usePiSettings() {
  return useQuery({
    queryKey: ["pi-settings"],
    queryFn: async (): Promise<PiSettings> => {
      const result = await rpc.pi.getSettings();
      return result as PiSettings;
    },
    staleTime: Infinity,
  });
}

export function useUpdatePiSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: PiPartialSettings): Promise<PiSettings> => {
      const result = await rpc.pi.setSettings(settings);
      return result as PiSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["pi-settings"], data);
    },
  });
}
