import { api } from "./api";

function normalizeStudentList(response) {
  const payload = response?.data ?? response ?? {};

  const possibleData =
    payload?.data?.data ??
    payload?.data ??
    payload;

  if (Array.isArray(possibleData)) {
    return {
      items: possibleData,
      pagination: {
        page: 1,
        limit: possibleData.length || 10,
        total: possibleData.length,
        totalPages: 1
      },
      filters: {
        classes: [...new Set(possibleData.map((item) => item.className).filter(Boolean))],
        sections: [...new Set(possibleData.map((item) => item.section).filter(Boolean))]
      },
      stats: {
        total: possibleData.length,
        active: possibleData.filter((item) => item.status === "ACTIVE").length,
        pending: possibleData.filter((item) => item.status === "PENDING").length,
        archived: possibleData.filter((item) => item.status === "ARCHIVED").length
      }
    };
  }

  const items =
    possibleData?.items ??
    possibleData?.students ??
    possibleData?.records ??
    possibleData?.rows ??
    [];

  const pagination = possibleData?.pagination ?? possibleData?.meta ?? {};

  return {
    ...possibleData,
    items: Array.isArray(items) ? items : [],
    pagination: {
      page: Number(pagination.page || 1),
      limit: Number(pagination.limit || pagination.pageSize || 10),
      total: Number(
        pagination.total ??
        pagination.totalRecords ??
        items.length ??
        0
      ),
      totalPages: Number(
        pagination.totalPages ??
        pagination.pages ??
        1
      )
    },
    filters: {
      classes: possibleData?.filters?.classes || [],
      sections: possibleData?.filters?.sections || []
    },
    stats: {
      total:
        Number(possibleData?.stats?.total) ||
        Number(pagination.total) ||
        items.length,
      active:
        Number(possibleData?.stats?.active) ||
        items.filter((item) => item.status === "ACTIVE").length,
      pending:
        Number(possibleData?.stats?.pending) ||
        items.filter((item) => item.status === "PENDING").length,
      archived:
        Number(possibleData?.stats?.archived) ||
        items.filter((item) => item.status === "ARCHIVED").length
    }
  };
}

export const studentsApi = {
  list: async (params) =>
    normalizeStudentList(await api.get("/students", { params })),

  get: async (id) => {
    const response = await api.get(`/students/${id}`);
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },

  create: async (payload) =>
    (await api.post("/students", payload)).data,

  update: async ({ id, payload }) =>
    (await api.put(`/students/${id}`, payload)).data,

  updateStatus: async ({ id, status }) =>
    (await api.patch(`/students/${id}/status`, { status })).data,

  archive: async (id) =>
    (await api.delete(`/students/${id}`)).data,

  bulkAction: async (payload) =>
    (await api.post("/students/bulk-action", payload)).data,

  addNote: async ({ id, note }) =>
    (await api.post(`/students/${id}/notes`, { note })).data,

  addGuardian: async ({ id, payload }) =>
    (await api.post(`/students/${id}/guardians`, payload)).data,

  addDocument: async ({ id, payload }) =>
    (await api.post(`/students/${id}/documents`, payload)).data,

  changeClass: async ({ id, payload }) =>
    (await api.post(`/students/${id}/class-change`, payload)).data,

  uploadPhoto: async ({ id, file }) => {
    const formData = new FormData();
    formData.append("photo", file);
    return (await api.post(`/students/${id}/photo-upload`, formData)).data;
  },
  updatePhoto: async ({ id, photoUrl }) =>
    (await api.patch(`/students/${id}/photo`, { photoUrl })).data,

  history: async (id) => {
    const response = await api.get(`/students/${id}/history`);
    return response.data?.data?.data ?? response.data?.data ?? [];
  }
};
