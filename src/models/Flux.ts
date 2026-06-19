import type { TypeAssurance } from './TypeAssurance.ts';
import type { Personne } from './Personne.ts';
import type { Enfant } from './Enfant.ts';
import type { Entreprise } from './Entreprise.ts';
import type { Pret } from './Pret.ts';
import type { InfoAssureComplet } from './InfoAssureComplet.ts';
import type { Tarif } from './Tarif.ts';

export interface Flux {
  id?: number;
  type_assurance: TypeAssurance;
  personnes: Personne[];
  enfants: Enfant[];
  entreprise: Entreprise;
  prets: Pret[];
  info_assure_complets: InfoAssureComplet[];
  tarifs?: Tarif[];
}

