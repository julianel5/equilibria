import express from 'express';
import inventoryRoutes from './routes/inventory.routes';

const app = express();
app.use(express.json());

app.use('/api/inventory', inventoryRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[API] Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
