import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { geocodeHandler } from "./geocode.controller";

const router = Router();

/**
 * @openapi
 * /v1/geocode:
 *   get:
 *     tags: [Geocode]
 *     summary: Search for locations by query string
 *     description: Proxies the Mapbox Geocoding API to resolve place names or addresses into coordinates. Results are scoped to Canada and cached for 24 hours.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: The search query (e.g. "edmonton", "123 Main St")
 *         example: edmonton
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           default: 5
 *         description: Maximum number of results to return (1–10)
 *     responses:
 *       200:
 *         description: List of matching locations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           placeName:
 *                             type: string
 *                             example: Edmonton, Alberta, Canada
 *                           longitude:
 *                             type: number
 *                             example: -113.4938
 *                           latitude:
 *                             type: number
 *                             example: 53.5461
 *                           placeType:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["place"]
 *       400:
 *         description: Validation error — missing or empty query param
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       502:
 *         description: Mapbox geocoding service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", authenticate, geocodeHandler);

export default router;
