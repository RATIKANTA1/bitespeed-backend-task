import { Router } from 'express';
import { identifyContact } from '../controllers/identifyController';

const router = Router();

router.post('/', identifyContact);

export default router;
