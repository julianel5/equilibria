import express from 'express';
import inventoryRoutes from './routes/inventory.routes';
import stochasticRoutes from './routes/stochastic.routes';
import decisionesRoutes from './routes/decisiones.routes';
import colasRoutes from './routes/colas.routes';

const app = express();
app.use(express.json());

app.use('/api/inventory', inventoryRoutes);
app.use('/api/stochastic', stochasticRoutes);
app.use('/api/decisiones', decisionesRoutes);
app.use('/api/colas', colasRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[API] Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
