import axios from 'axios';
import { environment } from '../config/environment';
import type { Compte } from '../models';

const baseURL = environment.baseURL;

export const compteService = {
  getAllComptes: async (): Promise<Compte[]> => {
    const response = await axios.get<Compte[]>(`${baseURL}comptes`);
    return response.data;
  },

  addCompte: async (data: Compte): Promise<Compte> => {
    const response = await axios.post<Compte>(`${baseURL}comptes`, data);
    return response.data;
  },

  updateCompte: async (id: number, data: Compte): Promise<Compte> => {
    const response = await axios.put<Compte>(`${baseURL}comptes/${id}`, data);
    return response.data;
  },

  deleteCompte: async (id: number): Promise<void> => {
    await axios.delete(`${baseURL}comptes/${id}`, { responseType: 'text' });
  },

  getCompteById: async (id: number): Promise<Compte> => {
    const response = await axios.get<Compte>(`${baseURL}comptes/${id}`);
    return response.data;
  }
};

