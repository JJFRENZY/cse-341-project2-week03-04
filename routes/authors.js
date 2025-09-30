// routes/authors.js
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connect.js';
import { ObjectId } from 'mongodb';
import { jwtCheck, needWrite } from '../middleware/auth.js';

const router = Router();

// If you're on Zod >= 3.23, z.string().date() validates RFC3339 full-date (YYYY-MM-DD).
// If not, you can replace with: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
const AuthorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  birthdate: z.string().date(), // YYYY-MM-DD
  nationality: z.string().min(1),
  website: z.string().url().optional()
});

const parseId = (id) => {
  try { return new ObjectId(id); }
  catch {
    const e = new Error('Invalid id format');
    e.statusCode = 400; e.expose = true; throw e;
  }
};

/**
 * @openapi
 * tags:
 *   - name: Authors
 *     description: CRUD for authors
 *
 * components:
 *   schemas:
 *     Author:
 *       type: object
 *       required: [firstName, lastName, email, birthdate, nationality]
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *           example: 665f6a0f2c3d4b1a9f0a1234
 *         firstName:
 *           type: string
 *           example: J.R.R.
 *         lastName:
 *           type: string
 *           example: Tolkien
 *         email:
 *           type: string
 *           format: email
 *           example: tolkien@example.com
 *         birthdate:
 *           type: string
 *           format: date
 *           example: 1892-01-03
 *         nationality:
 *           type: string
 *           example: British
 *         website:
 *           type: string
 *           format: uri
 *           example: https://tolkien.co.uk
 */

/**
 * @openapi
 * /authors:
 *   get:
 *     summary: Get all authors
 *     tags: [Authors]
 *     responses:
 *       200:
 *         description: List of authors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Author' }
 */
router.get('/', async (_req, res, next) => {
  try {
    const docs = await getDb().collection('authors').find({}).toArray();
    res.status(200).json(docs);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /authors/{id}:
 *   get:
 *     summary: Get an author by id
 *     tags: [Authors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: An author
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Author' }
 *       400: { description: Invalid id }
 *       404: { description: Not found }
 */
router.get('/:id', async (req, res, next) => {
  try {
    const _id = parseId(req.params.id);
    const doc = await getDb().collection('authors').findOne({ _id });
    if (!doc) return res.status(404).json({ message: 'Author not found' });
    res.status(200).json(doc);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /authors:
 *   post:
 *     summary: Create a new author
 *     tags: [Authors]
 *     security:
 *       - oauth2: [write:library]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Author' }
 *           example:
 *             firstName: "J.R.R."
 *             lastName: "Tolkien"
 *             email: "tolkien@example.com"
 *             birthdate: "1892-01-03"
 *             nationality: "British"
 *             website: "https://tolkien.co.uk"
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden (missing scope) }
 *       415: { description: Unsupported Media Type }
 */
router.post('/', jwtCheck, needWrite, async (req, res, next) => {
  try {
    if (!req.is('application/json')) {
      return res.status(415).json({ message: 'Content-Type must be application/json' });
    }
    const parsed = AuthorSchema.parse(req.body);
    const result = await getDb().collection('authors').insertOne(parsed);
    res.status(201).location(`/authors/${result.insertedId}`).json({ id: result.insertedId.toString() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: err.flatten() });
    }
    next(err);
  }
});

/**
 * @openapi
 * /authors/{id}:
 *   put:
 *     summary: Replace an author
 *     tags: [Authors]
 *     security:
 *       - oauth2: [write:library]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Author' }
 *     responses:
 *       204: { description: Updated (no content) }
 *       400: { description: Validation/ID error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden (missing scope) }
 *       404: { description: Not found }
 *       415: { description: Unsupported Media Type }
 */
router.put('/:id', jwtCheck, needWrite, async (req, res, next) => {
  try {
    if (!req.is('application/json')) {
      return res.status(415).json({ message: 'Content-Type must be application/json' });
    }
    const _id = parseId(req.params.id);
    const parsed = AuthorSchema.parse(req.body);
    const result = await getDb().collection('authors').replaceOne({ _id }, parsed);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Author not found' });
    res.status(204).send();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: err.flatten() });
    }
    next(err);
  }
});

/**
 * @openapi
 * /authors/{id}:
 *   delete:
 *     summary: Delete an author
 *     tags: [Authors]
 *     security:
 *       - oauth2: [write:library]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       400: { description: Invalid id }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden (missing scope) }
 *       404: { description: Not found }
 */
router.delete('/:id', jwtCheck, needWrite, async (req, res, next) => {
  try {
    const _id = parseId(req.params.id);
    const result = await getDb().collection('authors').deleteOne({ _id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Author not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
