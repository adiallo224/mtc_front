import axios from 'axios';
import { environment } from '../config/environment';
import type { Flux, Tarif } from '../models';

const baseURL = environment.baseURL;
const prefixe = 'search';

export interface FluxData extends Flux {
  dateCreation?: string;
  dateModification?: string;
}

export const fluxService = {
  searchTarif: async (flux: Flux): Promise<Tarif[]> => {
    console.log("Mon flux : " + JSON.stringify(flux))
    const response = await axios.post<Tarif[]>(`${baseURL}${prefixe}/getTarifs`, flux);
    return response.data;
  },
  getAllFluxData: async (): Promise<FluxData[]> => {
    const response = await axios.get<FluxData[]>(`${baseURL}fluxdata`);
    return response.data;
  },
  deleteFluxData: async (id: string | number): Promise<void> => {
    await axios.delete(`${baseURL}fluxdata/${id}`);
  }
};

