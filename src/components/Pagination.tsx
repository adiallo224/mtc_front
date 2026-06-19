interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      // Afficher toutes les pages si moins de 7
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Toujours afficher la première page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Afficher les pages autour de la page actuelle
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Toujours afficher la dernière page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number | string) => {
    if (typeof page === 'number') {
      onPageChange(page);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>Eléments par page:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary text-gray-700 dark:text-gray-300 px-3 py-1.5 text-sm"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span className="hidden sm:inline-block ml-4">
          Affichage {startItem}-{endItem} sur {totalItems}
        </span>
      </div>

      <div className="flex items-center justify-center">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className={`flex size-10 items-center justify-center text-gray-500 dark:text-gray-400 rounded-full ${
            currentPage === 1
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          aria-label="Page précédente"
        >
          <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
            chevron_left
          </span>
        </button>

        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="text-sm font-normal leading-normal flex size-10 items-center justify-center text-gray-500 dark:text-white rounded-full"
              >
                ...
              </span>
            );
          }

          const pageNumber = page as number;
          const isActive = pageNumber === currentPage;

          return (
            <button
              key={pageNumber}
              onClick={() => handlePageClick(pageNumber)}
              className={`text-sm font-medium leading-normal flex size-10 items-center justify-center rounded-full transition-colors ${
                isActive
                  ? 'text-white bg-primary'
                  : 'text-gray-600 dark:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              aria-label={`Page ${pageNumber}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {pageNumber}
            </button>
          );
        })}

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || totalPages === 0}
          className={`flex size-10 items-center justify-center text-gray-500 dark:text-gray-400 rounded-full ${
            currentPage === totalPages || totalPages === 0
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          aria-label="Page suivante"
        >
          <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
            chevron_right
          </span>
        </button>
      </div>
    </div>
  );
}

