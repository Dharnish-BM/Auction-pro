import express from 'express';
import {
    activateUser,
    deactivateUser,
    deleteUser,
    getAvailableCaptains,
    getUser,
    getUsers,
    updateUser
} from '../controllers/userController.js';
import { isAdmin, protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and admin-only
router.use(protect, isAdmin);

router.get('/', getUsers);
router.get('/captains/available', getAvailableCaptains);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.patch('/:id/activate', activateUser);
router.patch('/:id/deactivate', deactivateUser);
router.delete('/:id', deleteUser);

export default router;
