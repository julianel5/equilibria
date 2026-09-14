import express from 'express';
import path from 'node:path';
import inventoryRoutes from './routes/inventory.routes';
import stochasticRoutes from './routes/stochastic.routes';
import decisionesRoutes from './routes/decisiones.routes';
import colasRoutes from './routes/colas.routes';
import plRoutes from './routes/pl.routes';

const app = express();
app.use(express.json());

app.use('/api/inventory', inventoryRoutes);
app.use('/api/stochastic', stochasticRoutes);
app.use('/api/decisiones', decisionesRoutes);
app.use('/api/colas', colasRoutes);
app.use('/api/pl', plRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[API] Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
