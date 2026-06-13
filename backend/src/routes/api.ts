import { Router } from 'express';
import { modelController } from '../controllers/modelController';
import { promptController } from '../controllers/promptController';
import { testController } from '../controllers/testController';
import { settingsController } from '../controllers/settingsController';

const router = Router();

router.get('/models', (req, res) => modelController.getModels(req, res));
router.get('/models/check', (req, res) => modelController.checkConnection(req, res));
router.post('/models/test-connection', (req, res) => modelController.testConnection(req, res));

router.get('/prompts', (req, res) => promptController.getAllPrompts(req, res));
router.get('/prompts/:id', (req, res) => promptController.getPromptById(req, res));
router.post('/prompts', (req, res) => promptController.createPrompt(req, res));
router.put('/prompts/:id', (req, res) => promptController.updatePrompt(req, res));
router.delete('/prompts/:id', (req, res) => promptController.deletePrompt(req, res));

router.post('/test/run', (req, res) => testController.runTest(req, res));
router.post('/test/batch', (req, res) => testController.batchTest(req, res));
router.get('/test/progress', (req, res) => testController.subscribeProgress(req, res));
router.get('/test/results', (req, res) => testController.getResults(req, res));
router.get('/test/results/:id', (req, res) => testController.getResultById(req, res));

router.post('/test/cancel', (req, res) => {
  testController.cancelTest();
  res.json({ message: '已取消所有测试' });
});

router.delete('/test/results', (req, res) => {
  testController.clearResults(req, res);
});

router.get('/settings', (req, res) => settingsController.getSettings(req, res));
router.put('/settings', (req, res) => settingsController.updateSettings(req, res));

export { router as apiRouter };