import type { TypeAssurance } from './TypeAssurance.ts';

export interface Tarif {
  id?: number;
  nom?: string | null;
  montant: string;
  type_assurance?: TypeAssurance | null;
  capture_img?: string | null;
  execution: boolean;
  erreur?: string | null;
  etape?: string | null;
  capture_img_erreur?: string | null;
  capture_img_path?: string | null;
  capture_img_erreur_path?: string | null;
  tempId?: string | null;
}

