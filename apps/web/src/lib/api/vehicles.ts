import {
  type CreateVehicleRequest,
  type UpdateVehicleRequest,
  type Vehicle,
  type VehicleListResponse,
  vehicleListResponseSchema,
  vehicleSchema,
} from "@chrysmec/shared";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "./client";

const vehicleResponse = z.object({ vehicle: vehicleSchema });

export function fetchVehicles(): Promise<VehicleListResponse> {
  return apiRequest("/vehicles?limit=100", vehicleListResponseSchema);
}

export async function createVehicle(input: CreateVehicleRequest): Promise<Vehicle> {
  const result = await apiRequest("/vehicles", vehicleResponse, { method: "POST", body: input });
  return result.vehicle;
}

export async function updateVehicle(
  id: string,
  input: UpdateVehicleRequest,
): Promise<Vehicle> {
  const result = await apiRequest(`/vehicles/${id}`, vehicleResponse, {
    method: "PATCH",
    body: input,
  });
  return result.vehicle;
}

export function deleteVehicle(id: string): Promise<void> {
  return apiRequestVoid(`/vehicles/${id}`, { method: "DELETE" });
}
