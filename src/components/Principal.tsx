import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

export default function Principal() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleDeconnexion = () => {
    // Logique de déconnexion ici (par exemple, nettoyer le localStorage, etc.)
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">Mutual-conseil</span>
              <nav className="hidden md:flex items-center space-x-6">
                <NavLink
                  to="./search"
                  end
                  className={({ isActive }) =>
                    `${
                      isActive
                        ? 'text-primary font-semibold border-b-2 border-primary pb-1'
                        : 'text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors duration-200'
                    }`
                  }
                >
                  Accueil
                </NavLink>
                <NavLink
                  to="./historiqueDemande"
                  className={({ isActive }) =>
                    `${
                      isActive
                        ? 'text-primary font-semibold border-b-2 border-primary pb-1'
                        : 'text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors duration-200'
                    }`
                  }
                >
                  Historique recherche
                </NavLink>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors duration-200 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  id="navbarDropdownMenuLink"
                  aria-expanded={isDropdownOpen}
                >
                  <span>Bienvenue</span>
                  <span className="material-icons-outlined text-sm">
                    {isDropdownOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsDropdownOpen(false)}
                    ></div>
                    <ul
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20"
                      aria-labelledby="navbarDropdownMenuLink"
                    >
                      <li>
                        <NavLink
                          to="./parametreGeneral"
                          end
                          onClick={() => setIsDropdownOpen(false)}
                          className={({ isActive }) =>
                            `block px-4 py-2 text-sm ${
                              isActive
                                ? 'bg-blue-500 text-white dark:bg-blue-600'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            } transition-colors`
                          }
                        >
                          Général
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="./profile"
                          end
                          onClick={() => setIsDropdownOpen(false)}
                          className={({ isActive }) =>
                            `block px-4 py-2 text-sm ${
                              isActive
                                ? 'bg-blue-500 text-white dark:bg-blue-600'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            } transition-colors`
                          }
                        >
                          Profile
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="./parametrage"
                          end
                          onClick={() => setIsDropdownOpen(false)}
                          className={({ isActive }) =>
                            `block px-4 py-2 text-sm ${
                              isActive
                                ? 'bg-blue-500 text-white dark:bg-blue-600'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            } transition-colors`
                          }
                        >
                          Paramétrage Comptes
                        </NavLink>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            handleDeconnexion();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          Déconnexion
                        </button>
                      </li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

