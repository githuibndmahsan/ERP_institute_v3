import { api } from "./api";

export const examsApi = {
  bootstrapBiseLahore: async () => {
    const response = await api.post(
      "/exams/bootstrap-bise-lahore-ssc-science"
    );
    return response.data;
  },

  schemes: async () => {
    const response = await api.get("/exams/schemes");
    return response.data?.data ?? response.data;
  },

  options: async () => {
    const response = await api.get("/exams/options");
    return response.data?.data ?? response.data;
  },

  exams: async (params) => {
    const response = await api.get("/exams", { params });
    return response.data?.data ?? response.data;
  },

  createExam: async (payload) => {
    const response = await api.post("/exams", payload);
    return response.data;
  },

  examSubjects: async (examId) => {
    const response = await api.get(`/exams/${examId}/subjects`);
    return response.data?.data ?? response.data;
  },

  marksSheet: async (examId, params) => {
    const response = await api.get(
      `/exams/${examId}/marks-sheet`,
      { params }
    );
    return response.data?.data ?? response.data;
  },

  saveMarksSheet: async (examId, payload) => {
    const response = await api.post(
      `/exams/${examId}/marks-sheet`,
      payload
    );
    return response.data;
  },

  generateResults: async (examId, payload) => {
    const response = await api.post(
      `/exams/${examId}/generate-results`,
      payload
    );
    return response.data;
  },

  results: async (examId, params) => {
    const response = await api.get(
      `/exams/${examId}/results`,
      { params }
    );
    return response.data?.data ?? response.data;
  },

  resultCard: async (id) => {
    const response = await api.get(`/exams/results/${id}/card`);
    return response.data?.data ?? response.data;
  }
};
