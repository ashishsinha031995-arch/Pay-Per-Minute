import { Router } from 'express';
import { 
  userSignUp, 
  userLogin, 
  userForgotPassword, 
  consultantLogin, 
  consultantRegister 
} from '../controllers/auth.controller.js';

const router = Router();

// Direct API mappings to guarantee seamless backward-compatibility
router.post('/user/signup', userSignUp);
router.post('/user/login', userLogin);
router.post('/user/forgot-password', userForgotPassword);

router.post('/consultants/login', consultantLogin);
router.post('/consultants/register', consultantRegister);

export default router;
