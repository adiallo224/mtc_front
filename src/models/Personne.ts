export interface Personne {
  id?: number;
  civilite: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  email: string;
  telephone: string;
  numero_voie?: number;
  nom_voie: string;
  code_postal: string;
  ville: string;
  pays: string;
  regime: string;
  nationalite: string;
  statut_profession: string;
  profession_specifique: string;
  profession: string;
  auto_entrepreneur: boolean;
}

