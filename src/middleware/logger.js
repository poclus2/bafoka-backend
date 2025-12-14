/**
 * Middleware de logging personnalisé
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log de la requête entrante
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  
  // Intercepter la fin de la réponse
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`
    );
  });
  
  next();
};
