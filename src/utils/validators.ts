export const validateTelephone = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10;
};

export const formatTelephone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length > 2) {
    return digits.match(/.{1,2}/g)?.join('-') || digits;
  }
  return digits;
};

export const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const removeDashes = (telephone: string): string => {
  return telephone.replace(/-/g, '');
};

// Convertir une date du format DD/MM/YYYY vers YYYY-MM-DD pour les inputs de type date
export const convertDateToInputFormat = (dateString: string): string => {
  if (!dateString) return '';
  
  // Si la date est déjà au format YYYY-MM-DD, la retourner telle quelle
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Si la date est au format DD/MM/YYYY, la convertir
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  }
  
  // Si c'est une autre format, essayer de parser avec Date
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.error('Erreur lors de la conversion de date:', e);
  }
  
  return '';
};

