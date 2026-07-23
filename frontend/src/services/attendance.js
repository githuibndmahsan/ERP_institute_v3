import { api } from "./api";

export const attendanceApi = {
  options: async () => {
    const response = await api.get("/attendance/options");
    return response.data?.data ?? response.data;
  },

  dashboard: async (params) => {
    const response = await api.get("/attendance/dashboard", { params });
    return response.data?.data ?? response.data;
  },

  studentHistory: async (params) => {
    const response = await api.get("/attendance/reports/student-history", { params });
    return response.data?.data ?? response.data;
  },

  classRegister: async (params) => {
    const response = await api.get("/attendance/reports/class-register", { params });
    return response.data?.data ?? response.data;
  },

  dateRangeReport: async (params) => {
    const response = await api.get("/attendance/reports/date-range", { params });
    return response.data?.data ?? response.data;
  },

  staffOptions: async () => {
    const response = await api.get("/attendance/staff/options");
    return response.data?.data ?? response.data;
  },

  staffDaily: async (params) => {
    const response = await api.get("/attendance/staff/daily", { params });
    return response.data?.data ?? response.data;
  },

  saveStaffDaily: async (payload) => {
    const response = await api.post("/attendance/staff/daily", payload);
    return response.data;
  },

  staffMonthlySummary: async (params) => {
    const response = await api.get("/attendance/staff/monthly-summary", { params });
    return response.data?.data ?? response.data;
  },

  daily: async (params) => {
    const response = await api.get("/attendance/daily", { params });
    return response.data?.data ?? response.data;
  },

  annual: async (params) => {
    const response = await api.get("/attendance/annual", { params });
    return response.data?.data ?? response.data;
  },

  save: async (payload) => {
    const response = await api.post("/attendance/daily", payload);
    return response.data;
  }
};
