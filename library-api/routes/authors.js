import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connect.js';
import { ObjectId } from 'mongodb';

const router = Router();

const AuthorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  birthdate: z.string().date(), // ISO date string (YYYY-MM-DD)
  nationality: z.string().min(1),
  website: z.string().url().optional()
});

const parseId = (id) => {
  try { return new ObjectId(id); }
  catch { const e = new Error('Invalid id format'); e.statusCode = 400; e.expose = true; throw e; }
};

/**
 * @openapi
 * tags:
 *   - name: Authors
 *     description: CRUD for authors
 */

router.get('/', async (_req, res, next) => {
  try {
    const docs = await getDb().collection('authors').find({}).toArray();
    res.status(200).json(docs);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const _id = parseId(req.params.id);
    const doc = await getDb().collection('authors').findOne({ _id });
    if (!doc) return res.status(404).json({ message: 'Author not found' });
    res.status(200).json(doc);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    if (!req.is('application/json')) return res.status(415).json({ message: 'Content-Type must be application/json' });
    const parsed = AuthorSchema.parse(req.body);
    const result = await getDb().collection('authors').insertOne(parsed);
    res.status(201).location(`/authors/${result.insertedId}`).json({ id: result.insertedId.toString() });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', errors: err.flatten() });
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!req.is('application/json')) return res.status(415).json({ message: 'Content-Type must be application/json' });
    const _id = parseId(req.params.id);
    const parsed = AuthorSchema.parse(req.body);
    const result = await getDb().collection('authors').replaceOne({ _id }, parsed);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Author not found' });
    res.status(204).send();
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', errors: err.flatten() });
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const _id = parseId(req.params.id);
    const result = await getDb().collection('authors').deleteOne({ _id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Author not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
