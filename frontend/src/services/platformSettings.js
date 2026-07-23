import { api } from "./api";

export const platformSettingsApi = {
  get: async () => (await api.get("/platform/settings")).data.data,
  update: async (payload) => (await api.put("/platform/settings", payload)).data,
  templates: async () => (await api.get("/platform/settings/templates")).data.data,
  audit: async () => (await api.get("/platform/settings/audit")).data.data
};
