// routes/books.js
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connect.js';
import { ObjectId } from 'mongodb';
import { jwtCheck, needWrite } from '../middleware/auth.js';

const router = Router();

/** Validate 24-char hex and transform to ObjectId for storage */
const ObjectIdString = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a 24-character hex string')
  .transform((s) => new ObjectId(s));

/** Main Book schema (request payload). _id is never client-supplied */
const BookSchema = z.object({
  title: z.string().min(1),
  isbn: z.string().min(10),
  authorId: ObjectIdString, // accept string, store as ObjectId
  publishedYear: z.number().int().gte(1400).lte(new Date().getFullYear() + 1),
  genres: z.array(z.string()).min(1),
  pages: z.number().int().positive(),
  inStock: z.boolean(),
  price: z.number().nonnegative()
});

const parseId = (id) => {
  try {
    return new ObjectId(id);
  } catch {
    const e = new Error('Invalid id format');
    e.statusCode = 400;
    e.expose = true;
    throw e;
  }
};

/**
 * @openapi
 * tags:
 *   - name: Books
 *     description: CRUD for books
 *
 * components:
 *   schemas:
 *     Book:
 *       type: object
 *       required:
 *         - title
 *         - isbn
 *         - authorId
 *         - publishedYear
 *         - genres
 *         - pages
 *         - inStock
 *         - price
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *           example: 665f6a0f2c3d4b1a9f0a1234
 *         title:
 *           type: string
 *           example: The Hobbit
 *         isbn:
 *           type: string
 *           example: 9780547928227
 *         authorId:
 *           type: string
 *           description: Author's ObjectId (24 hex chars)
 *           example: 665f6a0f2c3d4b1a9f0a1234
 *         publishedYear:
 *           type: integer
 *           example: 1937
 *         genres:
 *           type: array
 *           items: { type: string }
 *           example: ["Fantasy", "Classic"]
 *         pages:
 *           type: integer
 *           example: 310
 *         inStock:
 *           type: boolean
 *           example: true
 *         price:
 *           type: number
 *           example: 14.99
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
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Book' }
 */
router.get('/', async (_req, res, next) => {
  try {
    const docs = await getDb().collection('books').find({}).toArray();
    res.status(200).json(docs);
  } catch (err) {
    next(err);
  }
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
 *       200:
 *         description: A book
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Book' }
 *       400: { description: Invalid id }
 *       404: { description: Not found }
 */
router.get('/:id', async (req, res, next) => {
  try {
    const _id = parseId(req.params.id);
    const doc = await getDb().collection('books').findOne({ _id });
    if (!doc) return res.status(404).json({ message: 'Book not found' });
    res.status(200).json(doc);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /books:
 *   post:
 *     summary: Create a new book
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *       - oauth2: [write:library]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Book' }
 *           example:
 *             title: The Hobbit
 *             isbn: "9780547928227"
 *             authorId: "665f6a0f2c3d4b1a9f0a1234"
 *             publishedYear: 1937
 *             genres: ["Fantasy"]
 *             pages: 310
 *             inStock: true
 *             price: 14.99
 *     responses:
 *       201:
 *         description: Created; returns new book id
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { id: { type: string } } }
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
    const parsed = BookSchema.parse(req.body); // authorId now an ObjectId
    const result = await getDb().collection('books').insertOne(parsed);
    res
      .status(201)
      .location(`/books/${result.insertedId}`)
      .json({ id: result.insertedId.toString() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: err.flatten() });
    }
    next(err);
  }
});

/**
 * @openapi
 * /books/{id}:
 *   put:
 *     summary: Replace a book
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
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
 *           schema: { $ref: '#/components/schemas/Book' }
 *     responses:
 *       204: { description: Updated }
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
    const parsed = BookSchema.parse(req.body); // authorId now an ObjectId
    const result = await getDb().collection('books').replaceOne({ _id }, parsed);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Book not found' });
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
 * /books/{id}:
 *   delete:
 *     summary: Delete a book
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
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
    const result = await getDb().collection('books').deleteOne({ _id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Book not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
