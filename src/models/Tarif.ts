import type { TypeAssurance } from './TypeAssurance.ts';

export interface Tarif {
  id?: number;
  nom?: string | null;
  montant: string[];
  type_assurance?: TypeAssurance | null;
  execution: boolean;
  erreur?: string | null;
  etape?: string | null;
  captureImgPath?: string | null;
  captureImgErreurPath?: string | null;
  tempId?: string | null;
}

