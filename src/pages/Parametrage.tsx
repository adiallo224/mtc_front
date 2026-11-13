import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { compteService } from '../services/compteService';
import type { Compte } from '../models';
import { TypeAssuranceEnum, ListeFournisseurs } from '../enums';
import Pagination from '../components/Pagination';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import DataTable, { type DataTableColumn } from '../components/DataTable';

interface CompteFormData {
  identifiant: string;
  pwd: string;
  url: string;
  fournisseur: string;
  typeAssure: string;
  actif: boolean;
  niveau: number | null;
  ordre: number | null;
}

export default function Parametrage() {
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisibleSide, setIsVisibleSide] = useState(false);
  const [mode, setMode] = useState<'Ajouter' | 'Modifier'>('Ajouter');
  const [currentCompte, setCurrentCompte] = useState<Compte | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [filteredComptes, setFilteredComptes] = useState<Compte[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showPassword, setShowPassword] = useState(false);
  const [ordreError, setOrdreError] = useState<string | null>(null);
  const [comptesToDelete, setComptesToDelete] = useState<Compte[]>([]);
  const [deletingCompte, setDeletingCompte] = useState(false);
  const [selectedCompteIds, setSelectedCompteIds] = useState<Set<string | number>>(new Set());

  const compteKey = (compte: Compte): string | number => compte.id ?? `${compte.nomFournisseur}-${compte.username}`;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompteFormData>({
    defaultValues: {
      identifiant: '',
      pwd: '',
      url: '',
      fournisseur: '',
      typeAssure: '',
      actif: true,
      niveau: null,
      ordre: null
    }
  });

  useEffect(() => {
    getAllComptes();
  }, []);

  useEffect(() => {
    if (searchValue) {
      const filtered = comptes.filter(compte =>
        compte.nomFournisseur.toLowerCase().includes(searchValue.toLowerCase()) ||
        compte.username.toLowerCase().includes(searchValue.toLowerCase()) ||
        compte.typeAssurance.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredComptes(filtered);
    } else {
      setFilteredComptes(comptes);
    }
    setCurrentPage(1); // Réinitialiser à la page 1 lors d'un nouveau filtre
  }, [searchValue, comptes]);

  // Calculer les items paginés
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedComptes = filteredComptes.slice(startIndex, endIndex);

  // Fonction pour extraire le domaine de base de l'URL
  const getBaseUrl = (url: string | undefined | null): string => {
    // Vérifier si l'URL existe et n'est pas vide
    if (!url || url.trim() === '') {
      return 'URL non définie';
    }

    try {
      const urlObj = new URL(url);
      return urlObj.origin;
    } catch {
      // Si l'URL n'est pas valide, retourner les 40 premiers caractères
      return url.substring(0, Math.min(40, url.length));
    }
  };

  const getAllComptes = async () => {
    setLoading(true);
    try {
      const res = await compteService.getAllComptes();
      const sorted = res.sort((a, b) => Number(b.actif) - Number(a.actif));
      setComptes(sorted);
      setFilteredComptes(sorted);
    } catch (error) {
      console.error('Erreur lors de la récupération des comptes:', error);
    } finally {
      setLoading(false);
    }
  };

  const openSide = (visible: boolean) => {
    setIsVisibleSide(visible);
    setMode('Ajouter');
    setOrdreError(null);
    reset({
      identifiant: '',
      pwd: '',
      url: '',
      fournisseur: '',
      typeAssure: '',
      actif: true,
      niveau: null,
      ordre: null
    });
    setCurrentCompte(null);
  };

  const closeSide = () => {
    setIsVisibleSide(false);
    setOrdreError(null);
    reset();
    setCurrentCompte(null);
  };

  const infoCompte = (compte: Compte) => {
    setCurrentCompte(compte);
    setIsVisibleSide(true);
    setMode('Modifier');
    setOrdreError(null);
    reset({
      identifiant: compte.username,
      pwd: compte.password,
      url: compte.urlFournisseur,
      fournisseur: compte.nomFournisseur,
      typeAssure: compte.typeAssurance,
      actif: compte.actif,
      niveau: compte.niveau ?? null,
      ordre: compte.ordre ?? null
    });
  };

  const onSubmit = async (data: CompteFormData) => {
    setOrdreError(null);
    try {
      let sourcePart = '';
      if (data.typeAssure === 'PRET') {
        sourcePart = 'Prêt';
      } else if (data.typeAssure === 'MUTUELLE_INDIV') {
        sourcePart = 'Mutuelle_Indiv';
      } else if (data.typeAssure === 'MUTUELLE_PRO') {
        sourcePart = 'Mutuelle_Pro';
      } else if (data.typeAssure === 'AUTO') {
        sourcePart = 'Auto';
      }

      const nomFournisseur = mode === 'Ajouter'
        ? `${data.fournisseur}_${sourcePart}`
        : data.fournisseur;

      const compteData: Compte = {
        username: data.identifiant,
        password: data.pwd,
        nomFournisseur: nomFournisseur,
        urlFournisseur: data.url,
        typeAssurance: data.typeAssure,
        actif: mode === 'Ajouter' ? true : data.actif,
        source: `${data.fournisseur}${sourcePart}`,
        niveau: data.niveau ?? undefined,
        ordre: data.ordre ?? null
      };

      if (mode === 'Ajouter') {
        await compteService.addCompte(compteData);
      } else if (currentCompte?.id) {
        await compteService.updateCompte(currentCompte.id, compteData);
      }

      await getAllComptes();
      closeSide();
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { status?: number; data?: { message?: string } } }).response?.status === 409
      ) {
        const errResp = (error as { response: { data?: { message?: string } } }).response;
        setOrdreError(errResp.data?.message ?? "Cet ordre est déjà utilisé pour ce type d'assurance.");
      } else {
        console.error("Erreur lors de l'enregistrement:", error);
      }
    }
  };

  const toggleCompteStatus = async (compte: Compte) => {
    if (!compte.id) {
      console.error('ID is undefined');
      return;
    }

    try {
      const updatedCompte: Compte = {
        ...compte,
        actif: !compte.actif
      };
      await compteService.updateCompte(compte.id, updatedCompte);
      await getAllComptes();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  };

  const deleteCompte = (compte: Compte) => {
    if (!compte.id) {
      console.error('ID is undefined');
      return;
    }
    setComptesToDelete([compte]);
  };

  const handleBulkDeleteComptes = () => {
    const items = comptes.filter(compte => selectedCompteIds.has(compteKey(compte)));
    if (items.length > 0) {
      setComptesToDelete(items);
    }
  };

  const confirmDeleteCompte = async () => {
    if (comptesToDelete.length === 0) return;
    setDeletingCompte(true);
    try {
      const keysToDelete = new Set(comptesToDelete.map(compteKey));
      await Promise.all(
        comptesToDelete
          .filter((compte): compte is Compte & { id: number } => !!compte.id)
          .map(compte => compteService.deleteCompte(compte.id))
      );
      await getAllComptes();
      setSelectedCompteIds(prev => {
        const next = new Set(prev);
        keysToDelete.forEach(key => next.delete(key));
        return next;
      });
      setComptesToDelete([]);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('La suppression a échoué. Veuillez réessayer.');
    } finally {
      setDeletingCompte(false);
    }
  };

  const toggleCompteRow = (key: string | number) => {
    setSelectedCompteIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAllComptes = () => {
    setSelectedCompteIds(prev => {
      const allSelected = paginatedComptes.length > 0 && paginatedComptes.every(compte => prev.has(compteKey(compte)));
      const next = new Set(prev);
      if (allSelected) {
        paginatedComptes.forEach(compte => next.delete(compteKey(compte)));
      } else {
        paginatedComptes.forEach(compte => next.add(compteKey(compte)));
      }
      return next;
    });
  };

  const compteHeaderClass = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';
  const compteCellClass = 'px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100';

  const columns: DataTableColumn<Compte>[] = [
    {
      key: 'fournisseur',
      header: 'Fournisseur',
      headerClassName: compteHeaderClass,
      cellClassName: compteCellClass,
      render: (compte) => compte.nomFournisseur
    },
    {
      key: 'identifiant',
      header: 'Identifiant',
      headerClassName: compteHeaderClass,
      cellClassName: compteCellClass,
      render: (compte) => compte.username
    },
    {
      key: 'url',
      header: 'URL Fournisseur',
      headerClassName: compteHeaderClass,
      cellClassName: 'px-4 py-3 text-sm',
      render: (compte) => (
        <a
          href={compte.urlFournisseur}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
          title={compte.urlFournisseur}
        >
          {getBaseUrl(compte.urlFournisseur)}...
        </a>
      )
    },
    {
      key: 'typeAssurance',
      header: 'Type Assurance',
      headerClassName: compteHeaderClass,
      cellClassName: compteCellClass,
      render: (compte) => compte.typeAssurance
    },
    {
      key: 'niveau',
      header: 'Niveau',
      headerClassName: compteHeaderClass,
      cellClassName: compteCellClass,
      render: (compte) => (compte.niveau !== null && compte.niveau !== undefined ? compte.niveau : '-')
    },
    {
      key: 'ordre',
      header: 'Ordre',
      headerClassName: compteHeaderClass,
      cellClassName: compteCellClass,
      render: (compte) => (compte.ordre !== null && compte.ordre !== undefined ? compte.ordre : '-')
    },
    {
      key: 'statut',
      header: 'Statut',
      headerClassName: compteHeaderClass,
      cellClassName: compteCellClass,
      render: (compte) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={compte.actif}
            onChange={() => toggleCompteStatus(compte)}
            className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
            title={compte.actif ? 'Désactiver le compte' : 'Activer le compte'}
          />
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: compteHeaderClass,
      cellClassName: 'px-4 py-3 whitespace-nowrap text-sm font-medium',
      render: (compte) => (
        <div className="flex space-x-2">
          <button
            onClick={() => infoCompte(compte)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            Voir
          </button>
          {compte.id && (
            <button
              onClick={() => deleteCompte(compte)}
              className="text-red-600 hover:text-red-800 dark:text-red-400"
            >
              Supprimer
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
            <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Listes comptes</h3>
              <button
                onClick={() => openSide(true)}
                className="bg-white text-green-600 px-4 py-2 rounded hover:bg-gray-100 font-semibold"
              >
                Ajouter un compte
              </button>
            </div>

            <div className="p-6">
              {/* Barre de recherche */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Rechercher un compte"
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchValue && (
                    <button
                      onClick={() => setSearchValue('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Pagination */}
              {!loading && filteredComptes.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredComptes.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(newItemsPerPage) => {
                    setItemsPerPage(newItemsPerPage);
                    setCurrentPage(1);
                  }}
                />
              )}

              {/* Action groupée */}
              {selectedCompteIds.size > 0 && (
                <div className="mb-4 flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {selectedCompteIds.size} compte{selectedCompteIds.size > 1 ? 's' : ''} sélectionné{selectedCompteIds.size > 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={handleBulkDeleteComptes}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    <span className="material-icons-outlined text-base">delete</span>
                    <span>Supprimer la sélection</span>
                  </button>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={paginatedComptes}
                  keyExtractor={compteKey}
                  emptyMessage="Aucun compte trouvé."
                  selectable
                  selectedKeys={selectedCompteIds}
                  onToggleRow={toggleCompteRow}
                  onToggleAll={toggleAllComptes}
                />
              )}
            </div>
          </div>
        </div>

      {/* Modal formulaire */}
      {isVisibleSide && (
        <div className="fixed inset-0 bg-White bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {mode === 'Ajouter' ? 'Nouveau compte' : 'Modifier compte'}
              </h3>
              <button
                onClick={closeSide}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Fermer"
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {mode === 'Modifier' && (
                    <div className="flex items-center space-x-3">
                      <input
                        {...register('actif')}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Statut</label>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fournisseur <span className="text-red-500">*</span>
                    </label>
                    {mode === 'Modifier' ? (
                      <input
                        {...register('fournisseur')}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                    ) : (
                      <select
                        {...register('fournisseur', { required: 'Ce champ est requis' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="">Sélectionnez un fournisseur</option>
                        {Object.values(ListeFournisseurs).map((fournisseur) => (
                          <option key={fournisseur} value={fournisseur}>
                            {fournisseur}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.fournisseur && (
                      <p className="text-red-500 text-xs mt-1">{errors.fournisseur.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Identifiant <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('identifiant', {
                        required: 'Ce champ est requis',
                        minLength: { value: 2, message: 'Minimum 2 caractères' }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Entrer identifiant"
                    />
                    {errors.identifiant && (
                      <p className="text-red-500 text-xs mt-1">{errors.identifiant.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mot de passe <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        {...register('pwd')}
                        type={showPassword ? 'text' : 'password'}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Entrer le mot de passe"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        <span className="material-icons-outlined text-lg">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('url')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Entrer url"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type assurance <span className="text-red-500">*</span>
                    </label>
                    {mode === 'Modifier' ? (
                      <input
                        {...register('typeAssure')}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-600"
                      />
                    ) : (
                      <select
                        {...register('typeAssure', { required: 'Ce champ est requis' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="">Sélectionnez un type assurance</option>
                        {Object.values(TypeAssuranceEnum).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.typeAssure && (
                      <p className="text-red-500 text-xs mt-1">{errors.typeAssure.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Niveau
                    </label>
                    <input
                      {...register('niveau', {
                        min: { value: 0, message: 'La valeur minimum est 0' },
                        max: { value: 15, message: 'La valeur maximum est 15' }
                      })}
                      type="number"
                      min="0"
                      max="15"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 ${
                        errors.niveau ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Entrer le niveau"
                    />
                    {errors.niveau && (
                      <p className="text-red-500 text-xs mt-1">{errors.niveau.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ordre de lancement
                    </label>
                    <input
                      {...register('ordre', {
                        min: { value: 1, message: 'La valeur minimum est 1' }
                      })}
                      type="number"
                      min="1"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 ${
                        errors.ordre || ordreError ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ordre de lancement (1, 2, 3…)"
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      Unique par type d'assurance. Les services actifs sont lancés du plus petit au plus grand.
                    </p>
                    {errors.ordre && (
                      <p className="text-red-500 text-xs mt-1">{errors.ordre.message}</p>
                    )}
                    {ordreError && (
                      <p className="text-red-500 text-xs mt-1">{ordreError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={Object.keys(errors).length > 0}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {mode === 'Ajouter' ? 'Ajouter' : 'Modifier'}
                  </button>
                </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={comptesToDelete.length > 0}
        title={comptesToDelete.length > 1 ? 'Supprimer ces comptes ?' : 'Supprimer ce compte ?'}
        message={
          comptesToDelete.length > 1
            ? `Cette action supprimera définitivement ${comptesToDelete.length} comptes. Cette action est irréversible.`
            : `Cette action supprimera définitivement le compte ${comptesToDelete[0]?.nomFournisseur ?? ''}. Cette action est irréversible.`
        }
        loading={deletingCompte}
        onCancel={() => setComptesToDelete([])}
        onConfirm={confirmDeleteCompte}
      />
    </div>
  );
}
