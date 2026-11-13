export interface Compte {
  id?: number;
  username: string;
  password: string;
  nomFournisseur: string;
  urlFournisseur: string;
  typeAssurance: string;
  actif: boolean;
  source: string;
  niveau?: number;
  ordre?: number | null;
}

