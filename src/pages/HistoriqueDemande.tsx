import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fluxService } from '../services/fluxService';
import type { Flux, Tarif } from '../models';
import Pagination from '../components/Pagination';

interface HistoriqueItem {
  id: string | number;
  date: string;
  type_assurance: string;
  personnePrincipale: string;
  nombreTarifs: number;
  tarifs?: Tarif[];
  flux: Flux;
}

export default function HistoriqueDemande() {
  const navigate = useNavigate();
  const [historique, setHistorique] = useState<HistoriqueItem[]>([]);
  const [filteredHistorique, setFilteredHistorique] = useState<HistoriqueItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<HistoriqueItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    // Charger l'historique depuis l'API
    const loadHistorique = async () => {
      try {
        setLoading(true);
        setError(null);
        const fluxDataList = await fluxService.getAllFluxData();
        console.log('FluxData:', fluxDataList);
        // Transformer les données de l'API en format HistoriqueItem
        const historiqueItems: HistoriqueItem[] = fluxDataList.map((fluxData) => {
          // Le backend renvoie typeAssurance (camelCase) mais le modèle TS attend type_assurance (snake_case)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawTA = (fluxData as any).typeAssurance ?? fluxData.type_assurance;
          const type_assurance =
            rawTA?.typeAssurance || rawTA?.type_assurance ||
            (rawTA?.assuPret || rawTA?.assu_pret ? 'PRET' :
             rawTA?.assuAuto || rawTA?.assu_auto ? 'AUTO' :
             rawTA?.assuMutuelIndiv || rawTA?.assu_mutuel_indiv ? 'MUTUELLE_INDIV' :
             rawTA?.assuMutuelPro || rawTA?.assu_mutuel_pro ? 'MUTUELLE_PRO' : 'NON_DEFINI');
          
          const personnePrincipale = fluxData.personnes && fluxData.personnes.length > 0
            ? `${fluxData.personnes[0].civilite || ''} ${fluxData.personnes[0].prenom || ''} ${fluxData.personnes[0].nom || ''}`.trim()
            : 'Non renseigné';
          
          return {
            id: fluxData.id || Date.now(),
            date: fluxData.dateCreation || fluxData.dateModification || '',
            type_assurance: type_assurance,
            personnePrincipale: personnePrincipale || 'Non renseigné',
            nombreTarifs: fluxData.tarifs ? fluxData.tarifs.length : 0,
            flux: fluxData
          };
        });
        
        historiqueItems.sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        setHistorique(historiqueItems);
        setFilteredHistorique(historiqueItems);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'historique:', err);
        setError('Erreur lors du chargement de l\'historique. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };

    loadHistorique();
  }, []);

  useEffect(() => {
    // Filtrer l'historique selon les critères
    let filtered = historique;

    if (searchTerm) {
        filtered = filtered.filter(item =>
          item.personnePrincipale.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.type_assurance.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type_assurance === selectedType);
    }

    // Trier par date décroissante
    filtered = filtered.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    setFilteredHistorique(filtered);
    setCurrentPage(1); // Réinitialiser à la page 1 lors d'un nouveau filtre
  }, [searchTerm, selectedType, historique]);

  // Calculer les items paginés
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHistorique = filteredHistorique.slice(startIndex, endIndex);

  const handleViewDetails = (item: HistoriqueItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleRelancerRecherche = (item: HistoriqueItem) => {
    // Sauvegarder le flux dans localStorage pour le pré-remplir dans Search
    localStorage.setItem('fluxRecherche', JSON.stringify(item.flux));
    navigate('/principal/search');
  };

  const handleDelete = (id: string | number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette recherche de l\'historique ?')) {
      // Note: La suppression devrait être faite via API, mais pour l'instant on filtre localement
      const updated = historique.filter(item => item.id !== id);
      setHistorique(updated);
    }
  };

  // const handleDeleteAll = () => {
  //   if (window.confirm('Êtes-vous sûr de vouloir supprimer tout l\'historique ?')) {
  //     // Note: La suppression devrait être faite via API, mais pour l'instant on vide localement
  //     setHistorique([]);
  //     setFilteredHistorique([]);
  //   }
  // };

  return (
    <div className="max-w-xl 2xl:max-w-[100%] mx-auto space-y-8">
      <section className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Historique des recherches</h2>
            <p className="text-gray-500 dark:text-gray-400">Consultez vos recherches précédentes et relancez-les si besoin.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Chargement de l'historique...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <span className="material-icons-outlined text-red-400 text-6xl mb-4 block">error_outline</span>
            <p className="text-red-600 dark:text-red-400 text-lg mb-2">Erreur</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
          </div>
        ) : historique.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-icons-outlined text-gray-400 text-6xl mb-4 block">history</span>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Aucune recherche dans l'historique</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Effectuez une recherche pour qu'elle apparaisse ici.</p>
          </div>
        ) : (
          <>
            {/* Filtres */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rechercher
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nom, type d'assurance..."
                  className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type d'assurance
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="all">Tous</option>
                  <option value="PRET">Prêt</option>
                  <option value="AUTO">Auto</option>
                  <option value="MUTUELLE_INDIV">Mutuelle individuelle</option>
                  <option value="MUTUELLE_PRO">Mutuelle Pro</option>
                </select>
              </div>
            </div>

            {/* Pagination */}
            {filteredHistorique.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredHistorique.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1);
                }}
              />
            )}

            {/* Tableau */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type assurance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Assuré principal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredHistorique.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Aucun résultat trouvé
                      </td>
                    </tr>
                  ) : (
                    paginatedHistorique.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {item.date
                            ? new Date(item.date).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {item.type_assurance.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {item.personnePrincipale}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewDetails(item)}
                              className="text-primary hover:text-blue-600 flex items-center space-x-1"
                              title="Voir détails"
                            >
                              <span className="material-icons-outlined text-base">visibility</span>
                              <span>Détails</span>
                            </button>
                            <button
                              onClick={() => handleRelancerRecherche(item)}
                              className="text-green-600 hover:text-green-700 flex items-center space-x-1"
                              title="Relancer recherche"
                            >
                              <span className="material-icons-outlined text-base">refresh</span>
                              <span>Relancer</span>
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-700 flex items-center space-x-1"
                              title="Supprimer"
                            >
                              <span className="material-icons-outlined text-base">delete</span>
                              <span>Supprimer</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Modal de détails */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-7xl max-h-[90vh] overflow-auto w-full shadow-xl">
            <div className="flex justify-end items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedItem(null);
                }}
                className="text-primary hover:text-blue-600 transition-colors"
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="px-4 sm:px-6 lg:px-10 py-8 space-y-8">
              {/* En-tête avec titre et statut */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div className="flex min-w-72 flex-col gap-2">
                  <p className="text-3xl lg:text-4xl font-black leading-tight tracking-[-0.033em] text-[#0d121b] dark:text-white">
                    Synthèse de la recherche {selectedItem.flux.id ? `C${selectedItem.flux.id}` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Assurés */}
              {selectedItem.flux.personnes && selectedItem.flux.personnes.length > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-background-dark/50">
                  <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] p-6 text-[#0d121b] dark:text-white">
                    Assurés
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Civilité
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Nom
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Prénom
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Date de Naissance
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Téléphone
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {selectedItem.flux.personnes.map((personne, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {personne.civilite || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {personne.nom || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {personne.prenom || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {personne.date_naissance ? new Date(personne.date_naissance).toLocaleDateString('fr-FR') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {personne.email || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {personne.telephone || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Enfants */}
              {selectedItem.flux.enfants && selectedItem.flux.enfants.length > 0 && 
               selectedItem.flux.enfants.some(enfant => (enfant.nom && enfant.nom.trim()) || (enfant.prenom && enfant.prenom.trim())) && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-background-dark/50">
                  <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] p-6 text-[#0d121b] dark:text-white">
                    Enfants
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Prénom
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Date de Naissance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {selectedItem.flux.enfants
                          .filter(enfant => (enfant.nom && enfant.nom.trim()) || (enfant.prenom && enfant.prenom.trim()))
                          .map((enfant, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {enfant.prenom || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {enfant.date_naissance ? new Date(enfant.date_naissance).toLocaleDateString('fr-FR') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Informations Entreprise */}
              {selectedItem.flux.entreprise && selectedItem.flux.entreprise.nom_entreprise && selectedItem.flux.entreprise.nom_entreprise.trim() && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-background-dark/50 p-6">
                  <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] mb-4 text-[#0d121b] dark:text-white">
                    Informations Entreprise
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-sm font-normal leading-normal text-gray-500 dark:text-gray-400">Nom</p>
                      <p className="text-base font-medium leading-normal text-[#0d121b] dark:text-gray-200">
                        {selectedItem.flux.entreprise.nom_entreprise || 'Non renseigné'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-normal leading-normal text-gray-500 dark:text-gray-400">Adresse</p>
                      <p className="text-base font-medium leading-normal text-[#0d121b] dark:text-gray-200">
                        {selectedItem.flux.entreprise.numero_voie_entreprise && selectedItem.flux.entreprise.nom_voie_entreprise
                          ? `${selectedItem.flux.entreprise.numero_voie_entreprise} ${selectedItem.flux.entreprise.nom_voie_entreprise}, ${selectedItem.flux.entreprise.code_postal_entreprise} ${selectedItem.flux.entreprise.ville_entreprise}`
                          : 'Non renseigné'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-normal leading-normal text-gray-500 dark:text-gray-400">Contact</p>
                      <p className="text-base font-medium leading-normal text-[#0d121b] dark:text-gray-200">
                        {selectedItem.flux.entreprise.telephone || 'Non renseigné'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Prêts */}
              {selectedItem.flux.prets && selectedItem.flux.prets.length > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-background-dark/50">
                  <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] p-6 text-[#0d121b] dark:text-white">
                    Prêts
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Objet
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Banque
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Montant
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Durée
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Taux
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {selectedItem.flux.prets.map((pret, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {pret.objet || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {pret.banque || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {pret.montant_pret ? `${pret.montant_pret} €` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {pret.duree || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {pret.taux ? `${pret.taux}%` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Profil des Assurés */}
              {selectedItem.flux.personnes && selectedItem.flux.personnes.length > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-background-dark/50">
                  <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] p-6 text-[#0d121b] dark:text-white">
                    Profil des Assurés
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Assuré
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Profession
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Statut Fumeur
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Sports à risque
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {selectedItem.flux.personnes.map((personne, index) => {
                          const infoComplet = selectedItem.flux.info_assure_complets && selectedItem.flux.info_assure_complets[index]
                            ? selectedItem.flux.info_assure_complets[index]
                            : null;
                          const sportsRisque = infoComplet?.sport_risque ? 'Oui' : 'Aucun';
                          
                          return (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                                {`${personne.prenom || ''} ${personne.nom || ''}`.trim() || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                                {personne.profession || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                                {infoComplet?.fumeur ? 'Oui' : 'Non'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                                {sportsRisque}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Détails du Tarif */}
              {selectedItem.flux.tarifs && selectedItem.flux.tarifs.length > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-background-dark/50">
                  <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] p-6 text-[#0d121b] dark:text-white">
                    Détails du Tarif
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Fournisseur
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            Montant
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                              Type assurance
                          </th>
                            <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                              Execution
                          </th>
                          <th className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                             Aperçu
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {selectedItem.flux.tarifs.map((tarif, index) => (
                          <tr key={tarif.id || index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {tarif.nom || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {tarif.montant || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {tarif.type_assurance?.type_assurance || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {tarif.execution ? 'Oui' : 'Non'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0d121b] dark:text-gray-200">
                              {tarif.capture_img_path ? (
                                <button
                                  onClick={() => setSelectedImage(tarif.capture_img_path || null)}
                                  className="text-primary hover:text-blue-600 transition-colors"
                                  title="Voir l'aperçu"
                                >
                                  <span className="material-icons-outlined">visibility</span>
                                </button>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedItem(null);
                }}
                className="bg-primary font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-blue-600 transition-all duration-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour afficher l'image en grand */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-primary hover:text-blue-600 bg-white dark:bg-gray-800 rounded-full p-2 z-10 shadow-lg transition-colors"
              title="Fermer"
            >
              <span className="material-icons-outlined">close</span>
            </button>
            <div className="max-w-full max-h-full flex items-center justify-center">
              <img 
                src={selectedImage} 
                alt="Capture d'écran" 
                className="max-w-full max-h-[90vh] w-auto h-auto rounded-lg shadow-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
