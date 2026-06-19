import axios from 'axios';

export const locationService = {
  getVilleByCodePostal: async (codePostal: string): Promise<any[]> => {
    if (codePostal && codePostal.length === 5) {
      try {
        const apiUrl = `https://geo.api.gouv.fr/communes?codePostal=${codePostal}&fields=nom&format=json&geometry=centre`;
        const response = await axios.get<any[]>(apiUrl);
        return response.data || [];
      } catch (error) {
        console.error('Erreur lors de la récupération des villes:', error);
        return [];
      }
    }
    return [];
  }
};

