/**
 * Middleware de gestion globale des erreurs
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Erreur:', err);

  // Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      error: err.message
    });
  }

  // Erreur blockchain
  if (err.message.includes('blockchain') || err.message.includes('transaction')) {
    return res.status(503).json({
      success: false,
      message: 'Erreur blockchain',
      error: err.message
    });
  }

  // Erreur par défaut
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
};

/**
 * Middleware pour les routes non trouvées
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    path: req.originalUrl
  });
};
