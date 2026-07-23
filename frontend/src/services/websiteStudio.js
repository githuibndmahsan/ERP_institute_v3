import { api } from "./api";

export const websiteStudioApi = {
  async getDraft(institutionCode) {
    const response = await api.get("/website-studio", {
      params: { institutionCode }
    });
    return response.data;
  },

  async saveDraft(config) {
    const response = await api.put("/website-studio", config);
    return response.data;
  },

  async publish(config) {
    const response = await api.post(
      "/website-studio/publish",
      config
    );
    return response.data;
  },

  async unpublish() {
    const response = await api.post(
      "/website-studio/unpublish"
    );
    return response.data;
  },

  async getPublic(institutionCode) {
    const response = await api.get(
      `/website-studio/public/${encodeURIComponent(
        institutionCode
      )}`
    );
    return response.data;
  }
};
