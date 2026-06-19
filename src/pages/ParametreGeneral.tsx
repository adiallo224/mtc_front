import { useState, useEffect } from 'react';
import { parametrageGeneralService } from '../services/parametrageGeneralService';
import type { ParametrageGeneral } from '../models';

export default function ParametreGeneral() {
  const [parametrageGeneraux, setParametrageGeneraux] = useState<ParametrageGeneral[]>([]);
  const [isModified, setIsModified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [heure_purge, setHeurePurge] = useState<string>('00:00:00');

  useEffect(() => {
    loadParametrageGeneraux();
  }, []);

  const loadParametrageGeneraux = async () => {
    setLoading(true);
    try {
      const data = await parametrageGeneralService.getAllParametrageGenerals();
      console.log(JSON.stringify(data, null, 2));
      setParametrageGeneraux(data);
      
      if (data[0]?.heure_purge) {
        setHeurePurge(data[0].heure_purge);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const onFieldChanged = () => {
    setIsModified(true);
  };

  const handleDossierImageChange = (value: string) => {
    if (parametrageGeneraux[0]) {
      setParametrageGeneraux([{
        ...parametrageGeneraux[0],
        dossier_image: value
      }]);
      onFieldChanged();
    }
  };

  const handleNbJoursChange = (value: number) => {
    if (parametrageGeneraux[0]) {
      setParametrageGeneraux([{
        ...parametrageGeneraux[0],
        nb_jours: value
      }]);
      onFieldChanged();
    }
  };

  const handleModeRechercheChange = (value: string) => {
    if (parametrageGeneraux[0]) {
      setParametrageGeneraux([{
        ...parametrageGeneraux[0],
        mode_recherche: value
      }]);
      onFieldChanged();
    }
  };

  const handleHeurePurgeChange = (value: string) => {
    setHeurePurge(value);
    if (parametrageGeneraux[0]) {
      setParametrageGeneraux([{
        ...parametrageGeneraux[0],
        heure_purge: value
      }]);
      onFieldChanged();
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isModified && parametrageGeneraux[0]) {
      try {
        // Convertir l'heure au format HH:mm:ss si nécessaire
        let heureFormatee = heure_purge;
        if (heure_purge.length === 5) {
          // Format HH:mm, ajouter les secondes
          heureFormatee = `${heure_purge}:00`;
        }
        
        const dataToUpdate: ParametrageGeneral = {
          ...parametrageGeneraux[0],
          heure_purge: heureFormatee
        };

        await parametrageGeneralService.updateParametrageGeneral(dataToUpdate);
        setIsModified(false);
        await loadParametrageGeneraux();
      } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!parametrageGeneraux[0]) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md">
        <p className="text-gray-600 dark:text-gray-400">Aucun paramètre général trouvé.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Paramètrage Général</h3>
      
      <form onSubmit={onSubmit}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/3">
                  Paramètre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Valeur
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  Dossier image
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={parametrageGeneraux[0].dossier_image || ''}
                    onChange={(e) => handleDossierImageChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  Heure de purge
                </td>
                <td className="px-6 py-4">
                  <input
                    type="time"
                    value={heure_purge.substring(0, 5)}
                    onChange={(e) => {
                      const newValue = e.target.value.length === 5 ? `${e.target.value}:00` : e.target.value;
                      handleHeurePurgeChange(newValue);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  Nombre de jours
                </td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    value={parametrageGeneraux[0].nb_jours || 0}
                    onChange={(e) => handleNbJoursChange(Number(e.target.value))}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  Mode recherche
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={parametrageGeneraux[0].mode_recherche || ''}
                    onChange={(e) => handleModeRechercheChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {isModified && (
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              Modifier
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
