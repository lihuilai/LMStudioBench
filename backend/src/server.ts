import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api';
import { testRunner } from './services/testRunner';
import { settingsController } from './controllers/settingsController';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.send('LM Studio API Automation Test Server');
});

async function startServer() {
  // 初始化设置（从文件加载 LM Studio URL）
  settingsController.initialize();

  await testRunner.initialize();

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

process.on('SIGINT', async () => {
  await testRunner.close();
  process.exit(0);
});

startServer().catch(console.error);