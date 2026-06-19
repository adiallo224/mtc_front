import axios from 'axios';
import { environment } from '../config/environment';
import type { ParametrageGeneral } from '../models';

const baseURL = environment.baseURL;
const prefixe = 'parametreGeneral';

export const parametrageGeneralService = {
  getAllParametrageGenerals: async (): Promise<ParametrageGeneral[]> => {
    const response = await axios.get<ParametrageGeneral[]>(`${baseURL}${prefixe}/getAllParametreGenerals`);
    return response.data;
  },

  updateParametrageGeneral: async (data: ParametrageGeneral): Promise<void> => {
    await axios.put<ParametrageGeneral>(`${baseURL}${prefixe}/updateParametreGeneral`, data);
  },

  addParametrageGeneral: async (data: ParametrageGeneral): Promise<ParametrageGeneral> => {
    const response = await axios.post<ParametrageGeneral>(`${baseURL}${prefixe}/createParametreGeneral`, data);
    return response.data;
  },

  deleteParametrageGeneral: async (id: number): Promise<void> => {
    await axios.delete(`${baseURL}${prefixe}/deleteParametreGeneral/${id}`);
  }
};

