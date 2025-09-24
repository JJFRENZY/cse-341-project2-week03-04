import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connect.js';
import { ObjectId } from 'mongodb';

const router = Router();

const BookSchema = z.object({
  title: z.string().min(1),
  isbn: z.string().min(10),
  authorId: z.string().length(24), // ObjectId as string
  publishedYear: z.number().int().gte(1400).lte(new Date().getFullYear() + 1),
  genres: z.array(z.string()).min(1),
  pages: z.number().int().positive(),
  inStock: z.boolean(),
  price: z.number().nonnegative()
});

const parseId = (id) => {
  try { return new ObjectId(id); }
  catch { const e = new Error('Invalid id format'); e.statusCode = 400; e.expose = true; throw e; }
};

/**
 * @openapi
 * tags:
 *   - name: Books
 *     description: CRUD for books
 */

/**
 * @openapi
 * /books:
 *   get:
 *     summary: Get all books
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: List of books
 */
router.get('/', async (_req, res, next) => {
  try {
    const docs = await getDb().collection('books').find({}).toArray();
    res.status(200).json(docs);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /books/{id}:
 *   get:
 *     summary: Get a book by id
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: A book }
 *       400: { description: Invalid id }
 *       404: { description: Not found }
 */
router.get('/:id', async (req, res, next) => {
  try {
    const _id = parseId(req.params.id);
    const doc = await getDb().collection('books').findOne({ _id });
    if (!doc) return res.status(404).json({ message: 'Book not found' });
    res.status(200).json(doc);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /books:
 *   post:
 *     summary: Create a new book
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation error }
 */
router.post('/', async (req, res, next) => {
  try {
    if (!req.is('application/json')) return res.status(415).json({ message: 'Content-Type must be application/json' });
    const parsed = BookSchema.parse(req.body);
    const result = await getDb().collection('books').insertOne(parsed);
    res.status(201).location(`/books/${result.insertedId}`).json({ id: result.insertedId.toString() });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', errors: err.flatten() });
    next(err);
  }
});

/**
 * @openapi
 * /books/{id}:
 *   put:
 *     summary: Replace a book
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       204: { description: Updated }
 *       400: { description: Validation/ID error }
 *       404: { description: Not found }
 */
router.put('/:id', async (req, res, next) => {
  try {
    if (!req.is('application/json')) return res.status(415).json({ message: 'Content-Type must be application/json' });
    const _id = parseId(req.params.id);
    const parsed = BookSchema.parse(req.body);
    const result = await getDb().collection('books').replaceOne({ _id }, parsed);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Book not found' });
    res.status(204).send();
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', errors: err.flatten() });
    next(err);
  }
});

/**
 * @openapi
 * /books/{id}:
 *   delete:
 *     summary: Delete a book
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       400: { description: Invalid id }
 *       404: { description: Not found }
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const _id = parseId(req.params.id);
    const result = await getDb().collection('books').deleteOne({ _id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Book not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
