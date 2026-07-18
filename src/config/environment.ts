export const environment = {
  production: import.meta.env.PROD,
  // Dev: backend Spring Boot embarque, servi a la racine
  // Prod: backend deploye en .war sur Tomcat externe, contexte /mutualConseil
  baseURL: import.meta.env.PROD
    ? 'http://localhost:8080/mutualConseil/'
    : 'http://localhost:8080/'
};

