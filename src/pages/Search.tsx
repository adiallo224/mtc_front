import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { fluxService } from '../services/fluxService';
import { locationService } from '../services/locationService';
import { formatDate, formatTelephone, removeDashes, convertDateToInputFormat } from '../utils/validators';
import type { Flux, Personne, Enfant, Entreprise, Pret, InfoAssureComplet, TypeAssurance, Tarif } from '../models';
import { Civilite, Regime, ListeBanque, ListePays, ListeStatutProfession, ObjetPret, TypePret, Garantie, TypeDiffere,
  TypeTaux, Nationalite, OptionsPret, ListeProfession, CategorieProfession } from '../enums';
import SearchResults from '../components/SearchResults';

interface Step {
  stepId: number;
  stepRef: string;
  stepName: string;
  isCompleted: boolean;
}

export default function Search() {
  const [activeStep, setActiveStep] = useState<Step>({
    stepId: 1,
    stepRef: 'infoPers',
    stepName: 'Infos personnelles',
    isCompleted: false
  });

  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<number, any[]>>({});
  const [professionValues, setProfessionValues] = useState<Record<number, string>>({});

  const stepList: Step[] = [
    { stepId: 1, stepRef: 'infoPers', stepName: 'Infos personnelles', isCompleted: false },
    { stepId: 2, stepRef: 'infoEnt', stepName: 'Infos entreprise', isCompleted: false },
    { stepId: 3, stepRef: 'infoFam', stepName: 'Infos familiales', isCompleted: false },
    { stepId: 4, stepRef: 'prets', stepName: 'Prêts', isCompleted: false },
    { stepId: 5, stepRef: 'infoAssu', stepName: 'Infos complémentaires', isCompleted: false },
    { stepId: 6, stepRef: 'resultat', stepName: 'Resultat', isCompleted: false }
  ];

  const typeAssuranceForm = useForm<TypeAssurance>({
    defaultValues: {
      assu_pret: false,
      assu_auto: false,
      assu_mutuel_indiv: false,
      assu_mutuel_pro: false
    }
  });

  const assureForm = useForm<{ assures: Personne[] }>({
    defaultValues: {
      assures: [{
        civilite: '',
        nom: '',
        prenom: '',
        date_naissance: '',
        email: '',
        telephone: '',
        numero_voie: undefined as any,
        nom_voie: '',
        code_postal: '',
        ville: '',
        pays: ListePays.France,
        regime: '',
        nationalite: Nationalite.France,
        statut_profession: ListeStatutProfession.AUCUN_SECTEUR_ACTIVITE,
        profession_specifique: '',
        profession: '',
        auto_entrepreneur: false
      }]
    }
  });

  const { fields: assures, append: addAssure, remove: removeAssure } = useFieldArray({
    control: assureForm.control,
    name: 'assures'
  });

  const entrepriseForm = useForm<Entreprise>({
    defaultValues: {
      siret: '',
      nom_entreprise: '',
      date_creation_entreprise: '',
      code_ape: '',
      telephone: '',
      numero_voie_entreprise: undefined,
      nom_voie_entreprise: '',
      code_postal_entreprise: '',
      ville_entreprise: '',
      pays_entreprise: ListePays.France
    }
  });

  const infoFamilleForm = useForm<{ enfants: Enfant[] }>({
    defaultValues: {
      enfants: [{
        civilite: '',
        nom: '',
        prenom: '',
        date_naissance: ''
      }]
    }
  });

  const { fields: enfants, append: addEnfant, remove: removeEnfant } = useFieldArray({
    control: infoFamilleForm.control,
    name: 'enfants'
  });

  const pretForm = useForm<{ prets: Pret[] }>({
    defaultValues: {
      prets: [{
        nouveau_ou_reprise: OptionsPret.NOUVEAU,
        objet: ObjetPret.RESI_PRINCIPALE,
        banque: '',
        type: TypePret.IMMO_AMORTISSABLE,
        montant_pret: '',
        duree: '',
        differe: TypeDiffere.PASDEDIFFERE,
        duree_differe: '0',
        type_taux: TypeTaux.FIXE,
        taux: '',
        date_effet: '',
        duree_amort: ''
      }]
    }
  });

  const { fields: prets, append: addPret, remove: removePret } = useFieldArray({
    control: pretForm.control,
    name: 'prets'
  });

  const infoAssureCompletForm = useForm<{ personnesInfosComplements: InfoAssureComplet[] }>({
    defaultValues: {
      personnesInfosComplements: [{
        travail_manuel: false,
        travail_hauteur: false,
        travail_manuel_manu_lourde: false,
        produit_danger: false,
        metier_expose: false,
        sport_risque: false,
        fumeur: false,
        fumeur_elec_nico: false,
        fumeur_sans_nico: false,
        deplacement_pro_20000: false,
        deplacement_etranger_60: false,
        deplacement_pays_risque: false,
        instrument_precis: false,
        garantie: Garantie.IPTITTIPP,
        quotite_deces: '100',
        quotite: '',
        garantie_chomage: false
      }]
    }
  });

  const { fields: personnesInfosComplements, append: addInfoAssureComplet, remove: removeInfoAssureComplet } = useFieldArray({
    control: infoAssureCompletForm.control,
    name: 'personnesInfosComplements'
  });

  // Charger le flux depuis localStorage si on vient de l'historique
  useEffect(() => {
    const savedFlux = localStorage.getItem('fluxRecherche');
    if (savedFlux) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const flux: any = JSON.parse(savedFlux);

        // Le backend renvoie camelCase ; on accepte les deux conventions (camel ET snake)
        const rawTA = flux.typeAssurance ?? flux.type_assurance;
        if (rawTA) {
          // Utiliser l'enum typeAssurance comme source de vérité (les booléens DB peuvent être incohérents)
          const typeStr: string = rawTA.typeAssurance || rawTA.type_assurance || '';
          typeAssuranceForm.reset({
            assu_pret:         typeStr === 'PRET',
            assu_auto:         typeStr === 'AUTO',
            assu_mutuel_indiv: typeStr === 'MUTUELLE_INDIV',
            assu_mutuel_pro:   typeStr === 'MUTUELLE_PRO'
          });
        }

        const rawPersonnes = flux.personnes ?? [];
        if (rawPersonnes.length > 0) {
          const personnesNorm = rawPersonnes.map((p) => ({
            civilite:            p.civilite            || '',
            nom:                 p.nom                 || '',
            prenom:              p.prenom              || '',
            date_naissance:      convertDateToInputFormat(p.date_naissance || p.dateNaissance || ''),
            email:               p.email               || '',
            telephone:           p.telephone           || '',
            numero_voie:         p.numero_voie         != null ? Number(p.numero_voie)
                                 : p.numeroVoie        != null ? Number(p.numeroVoie) : undefined,
            nom_voie:            p.nom_voie            || p.nomVoie            || '',
            code_postal:         p.code_postal         || p.codePostal         || '',
            ville:               p.ville               || '',
            pays:                p.pays                || ListePays.France,
            regime:              p.regime              || '',
            nationalite:         p.nationalite         || Nationalite.France,
            statut_profession:   p.statut_profession   || p.statutProfession   || '',
            profession_specifique: p.profession_specifique || p.professionSpecifique || '',
            profession:          p.profession          || '',
            auto_entrepreneur:   p.auto_entrepreneur   ?? p.autoEntrepreneur   ?? false
          }));
          assureForm.reset({ assures: personnesNorm });

          // Synchroniser professionValues pour que le <select> contrôlé affiche la bonne valeur
          const profVals: Record<number, string> = {};
          personnesNorm.forEach((p, i) => { if (p.profession) profVals[i] = p.profession; });
          if (Object.keys(profVals).length > 0) setProfessionValues(profVals);
        }

        const rawIAC = flux.infoAssureComplets ?? flux.info_assure_complets ?? [];
        if (rawIAC.length > 0) {
          infoAssureCompletForm.reset({
            personnesInfosComplements: rawIAC.map((iac) => ({
              travail_manuel:             iac.travailManuel            ?? iac.travail_manuel            ?? false,
              travail_hauteur:            iac.travailHauteur           ?? iac.travail_hauteur           ?? false,
              travail_manuel_manu_lourde: iac.travailManuelManuLourde  ?? iac.travail_manuel_manu_lourde ?? false,
              produit_danger:             iac.produitDanger            ?? iac.produit_danger            ?? false,
              metier_expose:              iac.metierExpose             ?? iac.metier_expose             ?? false,
              sport_risque:               iac.sportRisque              ?? iac.sport_risque              ?? false,
              fumeur:                     iac.fumeur                   ?? false,
              fumeur_elec_nico:           iac.fumeurElecNico           ?? iac.fumeur_elec_nico          ?? false,
              fumeur_sans_nico:           iac.fumeurSansNico           ?? iac.fumeur_sans_nico          ?? false,
              deplacement_pro_20000:      iac.deplacementPro20000      ?? iac.deplacement_pro_20000     ?? false,
              deplacement_etranger_60:    iac.deplacementEtranger60    ?? iac.deplacement_etranger_60   ?? false,
              deplacement_pays_risque:    iac.deplacementPaysRisque    ?? iac.deplacement_pays_risque   ?? false,
              instrument_precis:          iac.instrumentPrecis         ?? iac.instrument_precis         ?? false,
              garantie:                   iac.garantie                 || Garantie.IPTITTIPP,
              quotite_deces:              iac.quotiteDeces             || iac.quotite_deces             || '100',
              quotite:                    iac.quotite                  || '',
              garantie_chomage:           iac.garantieChomage          ?? iac.garantie_chomage          ?? false,
              hauteur:                    iac.hauteur                  || ''
            }))
          });
        }

        const rawEnfants = flux.enfants ?? [];
        if (rawEnfants.length > 0) {
          infoFamilleForm.reset({
            enfants: rawEnfants.map((e) => ({
              civilite:       e.civilite       || '',
              nom:            e.nom            || '',
              prenom:         e.prenom         || '',
              date_naissance: convertDateToInputFormat(e.date_naissance || e.dateNaissance || '')
            }))
          });
        }

        const rawEnt = flux.entreprise;
        if (rawEnt) {
          entrepriseForm.reset({
            siret:                    rawEnt.siret                    || '',
            nom_entreprise:           rawEnt.nom_entreprise           || rawEnt.nomEntreprise           || '',
            date_creation_entreprise: convertDateToInputFormat(rawEnt.date_creation_entreprise || rawEnt.dateCreationEntreprise || ''),
            code_ape:                 rawEnt.code_ape                 || rawEnt.codeApe                 || rawEnt.codeAPE || '',
            telephone:                rawEnt.telephone                || '',
            numero_voie_entreprise:   rawEnt.numero_voie_entreprise   != null ? rawEnt.numero_voie_entreprise
                                      : rawEnt.numeroVoieEntreprise   != null ? rawEnt.numeroVoieEntreprise : undefined,
            nom_voie_entreprise:      rawEnt.nom_voie_entreprise      || rawEnt.nomVoieEntreprise      || '',
            code_postal_entreprise:   rawEnt.code_postal_entreprise   || rawEnt.codePostalEntreprise   || '',
            ville_entreprise:         rawEnt.ville_entreprise         || rawEnt.villeEntreprise         || '',
            pays_entreprise:          rawEnt.pays_entreprise          || rawEnt.paysEntreprise          || ListePays.France
          });
        }

        const rawPrets = flux.prets ?? [];
        if (rawPrets.length > 0) {
          pretForm.reset({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            prets: rawPrets.map((p: any) => ({
              nouveau_ou_reprise: p.nouveau_ou_reprise || p.nouveauOuReprise || OptionsPret.NOUVEAU,
              objet:              p.objet              || ObjetPret.RESI_PRINCIPALE,
              banque:             p.banque             || '',
              type:               p.type               || TypePret.IMMO_AMORTISSABLE,
              montant_pret:       p.montant_pret       || p.montantPret       || '',
              duree:              p.duree              || '',
              differe:            p.differe            || TypeDiffere.PASDEDIFFERE,
              duree_differe:      p.duree_differe      || p.dureeDiffere      || '0',
              type_taux:          p.type_taux          || p.typeTaux          || TypeTaux.FIXE,
              taux:               p.taux               || '',
              date_effet:         convertDateToInputFormat(p.date_effet || p.dateEffet || ''),
              duree_amort:        p.duree_amort        || p.dureeAmort        || ''
            }))
          });
        }

        localStorage.removeItem('fluxRecherche');
      } catch (error) {
        console.error('Erreur lors du chargement du flux:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = assureForm.watch((value, { name }) => {
      // Détecter les changements de code postal pour tous les assurés
      if (name && name.startsWith('assures.') && name.endsWith('.code_postal')) {
        const match = name.match(/assures\.(\d+)\.code_postal/);
        if (match) {
          const index = parseInt(match[1], 10);
          const code_postal = value.assures?.[index]?.code_postal;
          
          if (code_postal && code_postal.length === 5) {
            locationService.getVilleByCodePostal(code_postal).then(villes => {
              // Stocker les suggestions par index d'assuré
              setSuggestions(prev => ({ ...prev, [index]: villes }));
              
              // Si une seule ville est trouvée, la sélectionner automatiquement
              if (villes.length === 1) {
                assureForm.setValue(`assures.${index}.ville` as const, villes[0].nom);
              } else if (villes.length > 1) {
                // Si plusieurs villes, réinitialiser le champ ville pour permettre la sélection
                assureForm.setValue(`assures.${index}.ville` as const, '');
              } else {
                // Si aucune ville trouvée, réinitialiser
                assureForm.setValue(`assures.${index}.ville` as const, '');
                setSuggestions(prev => ({ ...prev, [index]: [] }));
              }
            }).catch(error => {
              console.error('Erreur lors de la récupération des villes:', error);
              setSuggestions(prev => ({ ...prev, [index]: [] }));
              assureForm.setValue(`assures.${index}.ville` as const, '');
            });
          } else if (code_postal && code_postal.length < 5) {
            // Si le code postal n'est pas complet, réinitialiser les suggestions
            setSuggestions(prev => ({ ...prev, [index]: [] }));
            assureForm.setValue(`assures.${index}.ville` as const, '');
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [assureForm]);

  // Synchroniser le nombre de personnesInfosComplements avec le nombre d'assures
  useEffect(() => {
    const currentAssuresCount = assures.length;
    const currentInfoCount = personnesInfosComplements.length;

    if (currentAssuresCount > currentInfoCount) {
      // Ajouter les infos complémentaires manquantes
      for (let i = currentInfoCount; i < currentAssuresCount; i++) {
        addInfoAssureComplet({
          travail_manuel: false,
          travail_hauteur: false,
          travail_manuel_manu_lourde: false,
          produit_danger: false,
          metier_expose: false,
          sport_risque: false,
          fumeur: false,
          fumeur_elec_nico: false,
          fumeur_sans_nico: false,
          deplacement_pro_20000: false,
          deplacement_etranger_60: false,
          deplacement_pays_risque: false,
          instrument_precis: false,
          garantie: Garantie.IPTITTIPP,
          quotite_deces: '100',
          quotite: '',
          garantie_chomage: false
        });
      }
    } else if (currentAssuresCount < currentInfoCount) {
      // Supprimer les infos complémentaires en trop
      for (let i = currentInfoCount - 1; i >= currentAssuresCount; i--) {
        removeInfoAssureComplet(i);
      }
    }
  }, [assures.length, personnesInfosComplements.length, addInfoAssureComplet, removeInfoAssureComplet]);

  // --- Visibilité des étapes selon le type d'assurance sélectionné ---
  const typeAssuranceValues = typeAssuranceForm.watch();
  const selectedType = typeAssuranceValues.assu_pret        ? 'PRET'
    : typeAssuranceValues.assu_auto         ? 'AUTO'
    : typeAssuranceValues.assu_mutuel_indiv ? 'MUTUELLE_INDIV'
    : typeAssuranceValues.assu_mutuel_pro   ? 'MUTUELLE_PRO'
    : null;

  const hiddenStepRefsByType: Record<string, string[]> = {
    MUTUELLE_INDIV: ['infoEnt', 'prets', 'infoAssu'],
    MUTUELLE_PRO:   ['prets', 'infoAssu'],
    PRET:           ['infoEnt', 'infoFam'],
    AUTO:           []
  };
  const hiddenStepRefs  = selectedType ? (hiddenStepRefsByType[selectedType] ?? []) : [];
  const visibleStepList = stepList.filter(s => !hiddenStepRefs.includes(s.stepRef));

  const goToNextStep = () => {
    const idx = visibleStepList.findIndex(s => s.stepRef === activeStep.stepRef);
    if (idx >= 0 && idx < visibleStepList.length - 1) setActiveStep(visibleStepList[idx + 1]);
  };
  const goToPrevStep = () => {
    const idx = visibleStepList.findIndex(s => s.stepRef === activeStep.stepRef);
    if (idx > 0) setActiveStep(visibleStepList[idx - 1]);
  };
  const isLastBeforeResultat = (ref: string): boolean => {
    const nonResultat = visibleStepList.filter(s => s.stepRef !== 'resultat');
    return nonResultat.length > 0 && nonResultat[nonResultat.length - 1].stepRef === ref;
  };

  const handleTypeAssuranceChange = (
    field: 'assu_pret' | 'assu_auto' | 'assu_mutuel_indiv' | 'assu_mutuel_pro',
    checked: boolean
  ) => {
    typeAssuranceForm.setValue('assu_pret', false);
    typeAssuranceForm.setValue('assu_auto', false);
    typeAssuranceForm.setValue('assu_mutuel_indiv', false);
    typeAssuranceForm.setValue('assu_mutuel_pro', false);
    if (checked) typeAssuranceForm.setValue(field, true);
  };

  // Si le type change et que l'étape courante devient masquée, revenir à infoPers
  useEffect(() => {
    if (hiddenStepRefs.includes(activeStep.stepRef)) {
      setActiveStep(stepList[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  const gotoStep = (stepIndex: number) => {
    setActiveStep(stepList[stepIndex]);
  };

  const rechercher = async () => {
    setLoading(true);
    const typeAssuranceValue = typeAssuranceForm.watch();
    let typeAssuranceString: string | undefined;

    if (typeAssuranceValue.assu_pret) {
      typeAssuranceString = 'PRET';
    } else if (typeAssuranceValue.assu_mutuel_indiv) {
      typeAssuranceString = 'MUTUELLE_INDIV';
    } else if (typeAssuranceValue.assu_mutuel_pro) {
      typeAssuranceString = 'MUTUELLE_PRO';
    } else if (typeAssuranceValue.assu_auto) {
      typeAssuranceString = 'AUTO';
    }

    const type_assurance: TypeAssurance = {
      ...typeAssuranceValue,
      type_assurance: typeAssuranceString
    };

    const assuresData = assureForm.getValues().assures;
    const personnes: Personne[] = assuresData.map((assure) => ({
      ...assure,
      date_naissance: formatDate(new Date(assure.date_naissance)),
      telephone: removeDashes(assure.telephone)
    }));

    const enfantsData = infoFamilleForm.getValues().enfants;
    const enfantsFormatted: Enfant[] = enfantsData.map((enfant) => ({
      ...enfant,
      date_naissance: formatDate(new Date(enfant.date_naissance))
    }));

    const entrepriseData = entrepriseForm.getValues();
    const entreprise: Entreprise = {
      ...entrepriseData,
      date_creation_entreprise: formatDate(new Date(entrepriseData.date_creation_entreprise))
    };

    const pretsData = pretForm.getValues().prets;
    const pretsFormatted: Pret[] = pretsData.map((pret) => ({
      ...pret,
      date_effet: formatDate(new Date(pret.date_effet))
    }));

    const info_assure_complets = infoAssureCompletForm.getValues().personnesInfosComplements;

    const flux: Flux = {
      type_assurance,
      personnes,
      enfants: enfantsFormatted,
      entreprise,
      prets: pretsFormatted,
      info_assure_complets
    };

    try {
      // Naviguer vers l'étape résultat avant la recherche pour afficher le loader
      gotoStep(5);
      const results = await fluxService.searchTarif(flux);
      setTarifs(results);
      setLoading(false);

      // Sauvegarder dans l'historique
      const historiqueItem = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type_assurance: typeAssuranceString || 'NON_DEFINI',
        personnePrincipale: personnes.length > 0 
          ? `${personnes[0].civilite} ${personnes[0].prenom} ${personnes[0].nom}`
          : 'Non renseigné',
        nombreTarifs: results.length,
        tarifs: results,
        flux: flux
      };

      const savedHistorique = localStorage.getItem('historiqueRecherches');
      const historique = savedHistorique ? JSON.parse(savedHistorique) : [];
      historique.unshift(historiqueItem);
      
      // Limiter à 50 recherches dans l'historique
      const limitedHistorique = historique.slice(0, 50);
      localStorage.setItem('historiqueRecherches', JSON.stringify(limitedHistorique));
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setTarifs([]);
      setLoading(false);
    }
  };

  // const isPretSelected = typeAssuranceForm.watch('assu_pret');
  // const isAutoSelected = typeAssuranceForm.watch('assu_auto');
  // const isMutuelIndivSelected = typeAssuranceForm.watch('assu_mutuel_indiv');
  // const isMutuelProSelected = typeAssuranceForm.watch('assu_mutuel_pro');

  return (
    <div className="max-w-6xl xl:max-w-[100%] mx-auto space-y-2">
      {/* Type Assurance Selection */}
      <section className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Type d'assurance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {([
            { field: 'assu_mutuel_indiv', label: 'Mutuelle individuelle' },
            { field: 'assu_mutuel_pro',   label: 'Mutuelle Pro' },
            { field: 'assu_auto',         label: 'Auto' },
            { field: 'assu_pret',         label: 'Prêt' }
          ] as const).map(({ field, label }) => {
            const isChecked  = typeAssuranceValues[field] ?? false;
            const isDisabled = !!selectedType && !isChecked;
            return (
              <label
                key={field}
                className={`flex items-center space-x-3 ${isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={(e) => handleTypeAssuranceChange(field, e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 disabled:cursor-not-allowed"
                />
                <span className={isDisabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}>
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Stepper */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
        <div className="w-full overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] py-2">
            {visibleStepList.map((step, visIdx) => {
              const activeVisIdx = visibleStepList.findIndex(s => s.stepRef === activeStep.stepRef);
              const isActive = step.stepRef === activeStep.stepRef;
              const isPast   = visIdx < activeVisIdx;
              return (
                <div key={step.stepId} className="flex items-center flex-1">
                  <div className="flex flex-col items-center text-center w-36">
                    <div
                      onClick={() => setActiveStep(step)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-2 cursor-pointer transition-all duration-300 ${
                        isActive ? 'bg-red-600 text-white shadow-lg scale-110'
                        : isPast  ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {visIdx + 1}
                    </div>
                    <span className={`font-semibold text-sm ${
                      isActive ? 'text-red-600 dark:text-red-400'
                      : isPast  ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.stepName}
                    </span>
                  </div>
                  {visIdx < visibleStepList.length - 1 && (
                    <div className="flex-1 mx-2 relative">
                      <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isPast ? 'bg-green-500' : isActive ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                          style={{ width: isPast ? '100%' : isActive ? '50%' : '0%' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progression
            </span>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              {(() => {
                const i = visibleStepList.findIndex(s => s.stepRef === activeStep.stepRef);
                return Math.round((Math.max(i, 0) / (visibleStepList.length - 1)) * 100);
              })()}%
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500 ease-out rounded-full"
              style={{
                width: `${(() => {
                  const i = visibleStepList.findIndex(s => s.stepRef === activeStep.stepRef);
                  return Math.round((Math.max(i, 0) / (visibleStepList.length - 1)) * 100);
                })()}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      {activeStep.stepRef === 'infoPers' && (
        <section className="bg-white dark:bg-gray-800 p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Informations personnelles</h2>
          <div className="flex justify-end mb-2">
            <button
              onClick={() => {
                const premierAssure = assures.length > 0 ? assureForm.getValues().assures[0] : null;
                const nouvelAssure = {
                  civilite: '',
                  nom: '',
                  prenom: '',
                  date_naissance: '',
                  email: '',
                  telephone: '',
                  numero_voie: premierAssure?.numero_voie || undefined ,
                  nom_voie: premierAssure?.nom_voie || '',
                  code_postal: premierAssure?.code_postal || '',
                  ville: premierAssure?.ville || '',
                  pays: premierAssure?.pays || ListePays.France,
                  regime: '',
                  nationalite: Nationalite.France,
                  statut_profession: ListeStatutProfession.AUCUN_SECTEUR_ACTIVITE,
                  profession_specifique: '',
                  profession: '',
                  auto_entrepreneur: false
                };
                addAssure(nouvelAssure);
                addInfoAssureComplet({
                  travail_manuel: false,
                  travail_hauteur: false,
                  travail_manuel_manu_lourde: false,
                  produit_danger: false,
                  metier_expose: false,
                  sport_risque: false,
                  fumeur: false,
                  fumeur_elec_nico: false,
                  fumeur_sans_nico: false,
                  deplacement_pro_20000: false,
                  deplacement_etranger_60: false,
                  deplacement_pays_risque: false,
                  instrument_precis: false,
                  garantie: Garantie.IPTITTIPP,
                  quotite_deces: '100',
                  quotite: '',
                  garantie_chomage: false
                });
              }}
              className="text-primary hover:text-blue-600 font-medium"
            >
              + Ajouter un assuré
            </button>
          </div>

          {assures.map((assure, index) => (
            <div key={assure.id} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-0">
              {assures.length > 1 && (
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assuré {index + 1}</h3>
                  <button
                    onClick={() => {
                      removeAssure(index);
                      removeInfoAssureComplet(index);
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Supprimer
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`civility-${index}`}>
                    Civilité <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...assureForm.register(`assures.${index}.civilite` as const, { required: true })}
                    id={`civility-${index}`}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Sélectionnez</option>
                    {Object.values(Civilite).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`last-name-${index}`}>
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...assureForm.register(`assures.${index}.nom` as const, { required: true })}
                    id={`last-name-${index}`}
                    type="text"
                    placeholder="Dupont"
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`first-name-${index}`}>
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...assureForm.register(`assures.${index}.prenom` as const, { required: true })}
                    id={`first-name-${index}`}
                    type="text"
                    placeholder="Jean"
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`birth-date-${index}`}>
                    Date de naissance <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...assureForm.register(`assures.${index}.date_naissance` as const, { required: true })}
                    id={`birth-date-${index}`}
                    type="date"
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`email-${index}`}>
                    Email
                  </label>
                  <input
                    {...assureForm.register(`assures.${index}.email` as const)}
                    id={`email-${index}`}
                    type="email"
                    placeholder="jean.dupont@email.com"
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`phone-${index}`}>
                    Téléphone
                  </label>
                  <input
                    {...assureForm.register(`assures.${index}.telephone` as const)}
                    id={`phone-${index}`}
                    type="tel"
                    placeholder="06 12 34 56 78"
                    onChange={(e) => {
                      const formatted = formatTelephone(e.target.value);
                      assureForm.setValue(`assures.${index}.telephone` as const, formatted);
                    }}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`numero-voie-${index}`}>
                    Numéro de voie <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name={`assures.${index}.numero_voie` as const}
                    control={assureForm.control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <input
                        {...field}
                        id={`numero-voie-${index}`}
                        type="number"
                        placeholder="Numéro de voie"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : Number(e.target.value);
                          field.onChange(value);
                        }}
                        className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`nom-voie-${index}`}>
                    Nom de voie <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...assureForm.register(`assures.${index}.nom_voie` as const, { required: true })}
                    id={`nom-voie-${index}`}
                    type="text"
                    placeholder="Nom de la voie"
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`postal-code-${index}`}>
                    Code postal <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...assureForm.register(`assures.${index}.code_postal` as const, { required: true })}
                    id={`postal-code-${index}`}
                    type="text"
                    maxLength={5}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`city-${index}`}>
                    Ville <span className="text-red-500">*</span>
                  </label>
                  {suggestions[index] && suggestions[index].length > 1 ? (
                    <select
                      {...assureForm.register(`assures.${index}.ville` as const, { required: true })}
                      id={`city-${index}`}
                      className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="">Sélectionnez</option>
                      {suggestions[index].map((ville) => (
                        <option key={ville.nom} value={ville.nom}>
                          {ville.nom}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...assureForm.register(`assures.${index}.ville` as const, { required: true })}
                      id={`city-${index}`}
                      type="text"
                      placeholder={suggestions[index] && suggestions[index].length === 1 ? suggestions[index][0].nom : "Ville"}
                      className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`country-${index}`}>
                    Pays
                  </label>
                  <select
                    {...assureForm.register(`assures.${index}.pays` as const)}
                    id={`country-${index}`}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  >
                    {Object.values(ListePays).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`nationalite-${index}`}>
                    Nationalité <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...assureForm.register(`assures.${index}.nationalite` as const, { required: true })}
                    id={`nationalite-${index}`}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  >
                    {Object.values(Nationalite).map((nat) => (
                      <option key={nat} value={nat}>
                        {nat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`regime-${index}`}>
                    Régime social <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...assureForm.register(`assures.${index}.regime` as const, { required: true })}
                    id={`regime-${index}`}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Sélectionnez un régime</option>
                    {Object.values(Regime).map((reg) => (
                      <option key={reg} value={reg}>
                        {reg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`statut-profession-${index}`}>
                    Statut profession <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...assureForm.register(`assures.${index}.statut_profession` as const, { required: true })}
                    id={`statut-profession-${index}`}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value={ListeStatutProfession.AUCUN_SECTEUR_ACTIVITE}>Aucun secteur d'activité spécifique</option>
                    {Object.values(ListeStatutProfession)
                      .filter(sp => sp !== ListeStatutProfession.AUCUN_SECTEUR_ACTIVITE)
                      .map((sp) => (
                        <option key={sp} value={sp}>
                          {sp}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`categorie-profession-${index}`}>
                    Catégorie profession <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...assureForm.register(`assures.${index}.profession_specifique` as const, { required: true })}
                    id={`categorie-profession-${index}`}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Sélectionnez une catégorie</option>
                    {Object.values(CategorieProfession).map((categorie) => (
                      <option key={categorie} value={categorie}>
                        {categorie}
                      </option>
                    ))}
                  </select>
                </div>

                {assureForm.watch(`assures.${index}.regime` as const) === Regime.TNS && (
                  <div className="flex items-center">
                    <input
                      {...assureForm.register(`assures.${index}.auto_entrepreneur` as const)}
                      id={`auto-entrepreneur-${index}`}
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor={`auto-entrepreneur-${index}`}>
                      Auto-entrepreneur (micro-BIC / micro-BNC)
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`profession-${index}`}>
                    Profession <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name={`assures.${index}.profession` as const}
                    control={assureForm.control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <select
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(e);
                          setProfessionValues(prev => ({ ...prev, [index]: value }));
                        }}
                        value={professionValues[index] ?? field.value ?? ''}
                        id={`profession-${index}`}
                        className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="">Sélectionnez une profession</option>
                        {Object.values(ListeProfession).map((lPro) => (
                          <option key={lPro} value={lPro}>
                            {lPro}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                {(professionValues[index] ?? assureForm.watch(`assures.${index}.profession` as const)) === ListeProfession.AUCUN_RESULTAT && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`profession-exacte-${index}`}>
                      Profession exacte <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...assureForm.register(`assures.${index}.profession` as const, { required: true })}
                      id={`profession-exacte-${index}`}
                      type="text"
                      placeholder="profession"
                      className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="mt-8 pt-6 flex justify-end">
            {isLastBeforeResultat('infoPers') ? (
              <button onClick={rechercher} disabled={loading} type="button"
                className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <span>Rechercher</span>
                <span className="material-icons-outlined">search</span>
              </button>
            ) : (
              <button onClick={goToNextStep} type="button"
                className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2">
                <span>Étape suivante</span>
                <span className="material-icons-outlined">arrow_forward</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Infos entreprise */}
      {activeStep.stepRef === 'infoEnt' && (
        <section className="bg-white dark:bg-gray-800 p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Informations entreprise</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="siret">
                SIRET
              </label>
              <input
                {...entrepriseForm.register('siret')}
                id="siret"
                type="text"
                placeholder="123 456 789 00012"
                className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="nom_entreprise">
                Nom de l'entreprise
              </label>
              <input
                {...entrepriseForm.register('nom_entreprise')}
                id="nom_entreprise"
                type="text"
                placeholder="Nom de l'entreprise"
                className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="date_creation_entreprise">
                Date de création
              </label>
              <input
                {...entrepriseForm.register('date_creation_entreprise')}
                id="date_creation_entreprise"
                type="date"
                className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="code_ape">
                Code APE
              </label>
              <input
                {...entrepriseForm.register('code_ape')}
                id="code_ape"
                type="text"
                placeholder="0000Z"
                className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="telephoneEntreprise">
                Téléphone
              </label>
              <input
                {...entrepriseForm.register('telephone')}
                id="telephoneEntreprise"
                type="tel"
                placeholder="06 12 34 56 78"
                className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="numero_voie_entreprise">
                Numéro de voie
              </label>
              <Controller
                name="numero_voie_entreprise"
                control={entrepriseForm.control}
                render={({ field }) => (
                  <input
                    {...field}
                    id="numero_voie_entreprise"
                    type="number"
                    placeholder="10"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : Number(e.target.value);
                      field.onChange(value);
                    }}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="nom_voie_entreprise">
                Nom de voie
              </label>
              <input
                {...entrepriseForm.register('nom_voie_entreprise')}
                id="nom_voie_entreprise"
                type="text"
                placeholder="Rue de la Paix"
                className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="code_postal_entreprise">
                Code postal
              </label>
              <input
                {...entrepriseForm.register('code_postal_entreprise')}
                id="code_postal_entreprise"
                type="text"
                maxLength={5}
                placeholder="75001"
                className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="ville_entreprise">
                Ville
              </label>
              <input
                {...entrepriseForm.register('ville_entreprise')}
                id="ville_entreprise"
                type="text"
                placeholder="Paris"
                className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="pays_entreprise">
                Pays
              </label>
              <select
                {...entrepriseForm.register('pays_entreprise')}
                id="pays_entreprise"
                className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
              >
                {Object.values(ListePays).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 pt-6 flex justify-between">
            <button onClick={goToPrevStep} type="button"
              className="bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2">
              <span className="material-icons-outlined">arrow_back</span>
              <span>Précédent</span>
            </button>
            {isLastBeforeResultat('infoEnt') ? (
              <button onClick={rechercher} disabled={loading} type="button"
                className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <span>Rechercher</span>
                <span className="material-icons-outlined">search</span>
              </button>
            ) : (
              <button onClick={goToNextStep} type="button"
                className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2">
                <span>Étape suivante</span>
                <span className="material-icons-outlined">arrow_forward</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Infos familiales */}
      {activeStep.stepRef === 'infoFam' && (
        <section className="bg-white dark:bg-gray-800 p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Informations familiales</h2>
        
          <div className="flex justify-end mb-2">
            <button
              onClick={() => addEnfant({
                civilite: '',
                nom: '',
                prenom: '',
                date_naissance: ''
              })}
              className="text-primary hover:text-blue-600 font-medium"
            >
              + Ajouter un enfant
            </button>
          </div>

          {enfants.map((enfant, index) => (
            <div key={enfant.id} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-0">
              {enfants.length > 1 && (
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Enfant {index + 1}</h3>
                  <button
                    onClick={() => removeEnfant(index)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Supprimer
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`enfant-civility-${index}`}>
                    Civilité
                  </label>
                  <select
                    {...infoFamilleForm.register(`enfants.${index}.civilite` as const)}
                    id={`enfant-civility-${index}`}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Sélectionnez</option>
                    {Object.values(Civilite).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`enfant-nom-${index}`}>
                    Nom
                  </label>
                  <input
                    {...infoFamilleForm.register(`enfants.${index}.nom` as const)}
                    id={`enfant-nom-${index}`}
                    type="text"
                    placeholder="Dupont"
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`enfant-prenom-${index}`}>
                    Prénom
                  </label>
                  <input
                    {...infoFamilleForm.register(`enfants.${index}.prenom` as const)}
                    id={`enfant-prenom-${index}`}
                    type="text"
                    placeholder="Marie"
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`enfant-date-${index}`}>
                    Date de naissance
                  </label>
                  <input
                    {...infoFamilleForm.register(`enfants.${index}.date_naissance` as const)}
                    id={`enfant-date-${index}`}
                    type="date"
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="mt-8 pt-6 flex justify-between">
            <button onClick={goToPrevStep} type="button"
              className="bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2">
              <span className="material-icons-outlined">arrow_back</span>
              <span>Précédent</span>
            </button>
            {isLastBeforeResultat('infoFam') ? (
              <button onClick={rechercher} disabled={loading} type="button"
                className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <span>Rechercher</span>
                <span className="material-icons-outlined">search</span>
              </button>
            ) : (
              <button onClick={goToNextStep} type="button"
                className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2">
                <span>Étape suivante</span>
                <span className="material-icons-outlined">arrow_forward</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Prêts */}
      {activeStep.stepRef === 'prets' && (
        <section className="bg-white dark:bg-gray-800 p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Informations prêts</h2>
        
          <div className="flex justify-end mb-2">
            <button
              onClick={() => addPret({
                nouveau_ou_reprise: OptionsPret.NOUVEAU,
                objet: ObjetPret.RESI_PRINCIPALE,
                banque: '',
                type: TypePret.IMMO_AMORTISSABLE,
                montant_pret: '',
                duree: '',
                differe: TypeDiffere.PASDEDIFFERE,
                duree_differe: '0',
                type_taux: TypeTaux.FIXE,
                taux: '',
                date_effet: '',
                duree_amort: ''
              })}
              className="text-primary hover:text-blue-600 font-medium"
            >
              + Ajouter un prêt
            </button>
          </div>

          {prets.map((pret, index) => (
            <div key={pret.id} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-0">
              {prets.length > 1 && (
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Prêt {index + 1}</h3>
                  <button
                    onClick={() => removePret(index)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Supprimer
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`pret-nouveau-${index}`}>
                    Nouveau ou Reprise
                  </label>
                  <select
                    {...pretForm.register(`prets.${index}.nouveau_ou_reprise` as const)}
                    id={`pret-nouveau-${index}`}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  >
                    {Object.values(OptionsPret).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`pret-objet-${index}`}>
                    Objet du prêt
                  </label>
                  <select
                    {...pretForm.register(`prets.${index}.objet` as const)}
                    id={`pret-objet-${index}`}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  >
                    {Object.values(ObjetPret).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`pret-banque-${index}`}>
                    Banque
                  </label>
                  <select
                    {...pretForm.register(`prets.${index}.banque` as const)}
                    id={`pret-banque-${index}`}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Sélectionnez</option>
                    {Object.values(ListeBanque).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`pret-type-${index}`}>
                    Type de prêt
                  </label>
                  <select
                    {...pretForm.register(`prets.${index}.type` as const)}
                    id={`pret-type-${index}`}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  >
                    {Object.values(TypePret).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`pret-montant-${index}`}>
                    Montant du prêt <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...pretForm.register(`prets.${index}.montant_pret` as const)}
                    id={`pret-montant-${index}`}
                    type="number"
                    placeholder="150000"
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`pret-duree-${index}`}>
                    Durée (en mois) <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...pretForm.register(`prets.${index}.duree` as const)}
                    id={`pret-duree-${index}`}
                    type="number"
                    placeholder="240"
                    onChange={(e) => {
                      const value = e.target.value;
                      pretForm.setValue(`prets.${index}.duree` as const, value);
                      // Calculer automatiquement la durée d'amortissement
                      const differe = pretForm.getValues(`prets.${index}.differe` as const);
                      const duree_differe = differe === TypeDiffere.PASDEDIFFERE ? 0 : parseFloat(pretForm.getValues(`prets.${index}.duree_differe` as const) || '0');
                      if (value) {
                        const dureeNum = parseFloat(value);
                        if (!isNaN(dureeNum)) {
                          const duree_amort = dureeNum - duree_differe;
                          pretForm.setValue(`prets.${index}.duree_amort` as const, duree_amort >= 0 ? duree_amort.toString() : '0');
                        }
                      }
                    }}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`pret-differe-${index}`}>
                    Différé
                  </label>
                  <Controller
                    name={`prets.${index}.differe` as const}
                    control={pretForm.control}
                    render={({ field }) => (
                      <select
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(e);
                          // Si "Pas de différé" est sélectionné, mettre duree_differe à 0
                          if (value === TypeDiffere.PASDEDIFFERE) {
                            pretForm.setValue(`prets.${index}.duree_differe` as const, '0');
                          }
                          // Calculer automatiquement la durée d'amortissement
                          const duree = pretForm.getValues(`prets.${index}.duree` as const);
                          const duree_differe = value === TypeDiffere.PASDEDIFFERE ? 0 : parseFloat(pretForm.getValues(`prets.${index}.duree_differe` as const) || '0');
                          if (duree) {
                            const dureeNum = parseFloat(duree);
                            if (!isNaN(dureeNum)) {
                              const duree_amort = dureeNum - duree_differe;
                              pretForm.setValue(`prets.${index}.duree_amort` as const, duree_amort >= 0 ? duree_amort.toString() : '0');
                            }
                          }
                        }}
                        id={`pret-differe-${index}`}
                        className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      >
                        {Object.values(TypeDiffere).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`pret-duree-differe-${index}`}>
                    Durée du différé (en mois) <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...pretForm.register(`prets.${index}.duree_differe` as const)}
                    id={`pret-duree-differe-${index}`}
                    type="number"
                    placeholder="0"
                    disabled={pretForm.watch(`prets.${index}.differe` as const) === TypeDiffere.PASDEDIFFERE}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Calculer automatiquement la durée d'amortissement
                      const duree = pretForm.getValues(`prets.${index}.duree` as const);
                      if (duree) {
                        const dureeNum = parseFloat(duree);
                        const duree_differe = parseFloat(value || '0');
                        if (!isNaN(dureeNum) && !isNaN(duree_differe)) {
                          const duree_amort = dureeNum - duree_differe;
                          pretForm.setValue(`prets.${index}.duree_amort` as const, duree_amort >= 0 ? duree_amort.toString() : '0');
                        }
                      }
                      pretForm.setValue(`prets.${index}.duree_differe` as const, value);
                    }}
                    className={`w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                      ${
                      pretForm.watch(`prets.${index}.differe` as const) === TypeDiffere.PASDEDIFFERE
                        ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-60'
                        : ''
                      }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`pret-duree-amort-${index}`}>
                    Durée d'amortissement (en mois) <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...pretForm.register(`prets.${index}.duree_amort` as const)}
                    id={`pret-duree-amort-${index}`}
                    type="number"
                    placeholder="240"
                    disabled={pretForm.watch(`prets.${index}.differe` as const) === TypeDiffere.PASDEDIFFERE}
                    className={`w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 ${
                      pretForm.watch(`prets.${index}.differe` as const) === TypeDiffere.PASDEDIFFERE
                        ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-60'
                        : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`pret-type-taux-${index}`}>
                    Type de taux
                  </label>
                  <select
                    {...pretForm.register(`prets.${index}.type_taux` as const)}
                    id={`pret-type-taux-${index}`}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  >
                    {Object.values(TypeTaux).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`pret-taux-${index}`}>
                    Taux (%)
                  </label>
                  <input
                    {...pretForm.register(`prets.${index}.taux` as const)}
                    id={`pret-taux-${index}`}
                    type="number"
                    step="0.01"
                    placeholder="2.5"
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`pret-date-effet-${index}`}>
                    Date d'effet
                  </label>
                  <input
                    {...pretForm.register(`prets.${index}.date_effet` as const)}
                    id={`pret-date-effet-${index}`}
                    type="date"
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="mt-8 pt-6 flex justify-between">
            <button onClick={goToPrevStep} type="button"
              className="bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2">
              <span className="material-icons-outlined">arrow_back</span>
              <span>Précédent</span>
            </button>
            {isLastBeforeResultat('prets') ? (
              <button onClick={rechercher} disabled={loading} type="button"
                className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <span>Rechercher</span>
                <span className="material-icons-outlined">search</span>
              </button>
            ) : (
              <button onClick={goToNextStep} type="button"
                className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2">
                <span>Étape suivante</span>
                <span className="material-icons-outlined">arrow_forward</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Infos complémentaires */}
      {activeStep.stepRef === 'infoAssu' && (
        <section className="bg-white dark:bg-gray-800 p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Informations complémentaires</h2>

          {assures.map((assure, index) => {
            // S'assurer qu'il y a un infoAssureComplet correspondant
            // const info = personnesInfosComplements[index] || {
            //   travail_manuel: false,
            //   travail_hauteur: false,
            //   travail_manuel_manu_lourde: false,
            //   produit_danger: false,
            //   metier_expose: false,
            //   sport_risque: false,
            //   fumeur: false,
            //   fumeur_elec_nico: false,
            //   fumeur_sans_nico: false,
            //   deplacement_pro_20000: false,
            //   deplacement_etranger_60: false,
            //   deplacement_pays_risque: false,
            //   instrument_precis: false,
            //   garantie: Garantie.IPTITTIPP,
            //   quotite_deces: '100',
            //   quotite: '',
            //   garantie_chomage: false
            // };
            
            return (
              <div key={assure.id || index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-0">
              {assures.length > 1 && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assuré {index + 1}</h3>
              )}

              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-4">Conditions de travail</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.travail_manuel` as const)}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Travail manuel</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.travail_hauteur` as const)}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Travail en hauteur</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.travail_manuel_manu_lourde` as const)}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Travail manuel lourd</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.produit_danger` as const)}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Produits dangereux</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.metier_expose` as const)}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Métier exposé</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.instrument_precis` as const)}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Instrument de précision</span>
                    </label>
                  </div>

                  {/* Champ de sélection de hauteur conditionnel */}
                  {infoAssureCompletForm.watch(`personnesInfosComplements.${index}.travail_hauteur` as const) && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hauteur <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.hauteur` as const)}
                        className="w-full px-3 py-2 rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                      >
                        <option value="">-- Sélectionnez la hauteur --</option>
                        <option value="0-3">0 à 3m</option>
                        <option value="3-10">3 à 10m</option>
                        <option value="10-12">10 à 12m</option>
                        <option value="12-15">12 à 15m</option>
                        <option value="15-20">15 à 20m</option>
                        <option value="10-25">Plus de 20m</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-4">Activités</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.sport_risque` as const)}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Sport à risque</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.deplacement_pro_20000` as const)}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Déplacement pro &gt; 20000 km/an</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.deplacement_etranger_60` as const)}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Déplacement étranger &gt; 60 jours/an</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.deplacement_pays_risque` as const)}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Déplacement pays à risque</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-4">Tabac</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.fumeur` as const)}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Fumeur</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.fumeur_elec_nico` as const)}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Fumeur électronique avec nicotine</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.fumeur_sans_nico` as const)}
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Fumeur électronique sans nicotine</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`hauteur-${index}`}>
                      Hauteur (si travail en hauteur)
                    </label>
                    <input
                      {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.hauteur` as const)}
                      id={`hauteur-${index}`}
                      type="text"
                      placeholder="0"
                      className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`garantie-${index}`}>
                      Garantie
                    </label>
                    <select
                      {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.garantie` as const)}
                      id={`garantie-${index}`}
                      className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                    >
                      {Object.values(Garantie).map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`quotite-deces-${index}`}>
                      Quotité décès (%)
                    </label>
                    <input
                      {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.quotite_deces` as const)}
                      id={`quotite-deces-${index}`}
                      type="text"
                      placeholder="100"
                      className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={`quotite-${index}`}>
                      Quotité (%)
                    </label>
                    <input
                      {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.quotite` as const)}
                      id={`quotite-${index}`}
                      type="text"
                      placeholder="100"
                      className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      {...infoAssureCompletForm.register(`personnesInfosComplements.${index}.garantie_chomage` as const)}
                      type="checkbox"
                      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Garantie chômage</span>
                  </label>
                </div>
              </div>
              </div>
            );
          })}

          <div className="mt-8 pt-6 flex justify-between">
            <button onClick={goToPrevStep} type="button"
              className="bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2">
              <span className="material-icons-outlined">arrow_back</span>
              <span>Précédent</span>
            </button>
            <button onClick={rechercher} disabled={loading} type="button"
              className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <span>Rechercher</span>
              <span className="material-icons-outlined">search</span>
            </button>
          </div>
        </section>
      )}

      {activeStep.stepRef === 'resultat' && (
        <section className="bg-white dark:bg-gray-800 p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <SearchResults results={tarifs} />
          )}
          <div className="mt-8 pt-6 flex justify-start">
            <button
              onClick={() => gotoStep(0)}
              className="bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-all duration-200 flex items-center space-x-2"
              type="button"
            >
              <span className="material-icons-outlined">arrow_back</span>
              <span>Précédent</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

