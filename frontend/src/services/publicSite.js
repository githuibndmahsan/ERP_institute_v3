import { api } from "./api";

export async function getPublicInstitutionSite(code) {
  const response = await api.get(`/public/site/${encodeURIComponent(code)}`);
  return response.data?.data ?? response.data;
}
