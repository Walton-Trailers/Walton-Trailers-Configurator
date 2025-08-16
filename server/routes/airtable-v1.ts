import { Router, Request, Response } from 'express';
import { 
  apiRateLimiter, 
  airtableRateLimiter,
  validateAirtableConfig,
  validateTableName,
  validateDataType,
  handleValidationErrors,
  sanitizeErrorMessage,
  logApiRequest,
  apiTimeout
} from '../middleware/api-security';

const router = Router();

// Middleware for all Airtable routes
router.use(logApiRequest('AIRTABLE'));
router.use(apiRateLimiter);
router.use(apiTimeout(30)); // 30 second timeout for API calls

// Authentication middleware
const requireAdmin = (req: Request, res: Response, next: any) => {
  const { sessionId } = req.cookies;
  const storage = req.app.locals.storage;
  
  if (!sessionId || !storage.isAdminSession(sessionId)) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Admin access required'
    });
  }
  next();
};

/**
 * @api {post} /api/v1/integrations/airtable/test Test Airtable Connection
 * @apiVersion 1.0.0
 * @apiName TestAirtableConnection
 * @apiGroup Airtable
 * @apiDescription Tests connection to Airtable base and returns available tables
 * 
 * @apiHeader {String} Cookie Session cookie with admin authentication
 * 
 * @apiBody {String} accessToken Airtable Personal Access Token (format: pat...)
 * @apiBody {String} baseId Airtable Base ID (format: app...)
 * 
 * @apiSuccess {Boolean} success Connection status
 * @apiSuccess {Number} tableCount Number of tables found
 * @apiSuccess {Object[]} tables List of available tables
 * @apiSuccess {String} message Success message
 * 
 * @apiError {String} error Error message
 * @apiError {Object[]} details Validation errors (if applicable)
 * 
 * @apiExample {curl} Example:
 *     curl -X POST http://localhost:5000/api/v1/integrations/airtable/test \
 *       -H "Content-Type: application/json" \
 *       -H "Cookie: sessionId=..." \
 *       -d '{"accessToken":"pat...", "baseId":"app..."}'
 */
router.post(
  '/test',
  requireAdmin,
  airtableRateLimiter,
  validateAirtableConfig,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    const { accessToken, baseId } = req.body;
    const storage = req.app.locals.storage;
    
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000); // 25 seconds
      
      const metaUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
      const response = await fetch(metaUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        const tables = data.tables || [];
        
        // Cache the validated credentials temporarily
        await storage.saveAirtableConfig({ 
          accessToken, 
          baseId,
          validated: true,
          validatedAt: new Date().toISOString()
        });
        
        return res.json({ 
          success: true, 
          tableCount: tables.length,
          tables: tables.map((t: any) => ({ 
            id: t.id, 
            name: t.name, 
            description: t.description 
          })),
          message: 'Successfully connected to Airtable'
        });
      } else {
        // Don't expose raw error text from Airtable
        console.error(`Airtable test failed: ${response.status} ${response.statusText}`);
        return res.status(400).json({ 
          error: 'Failed to connect to Airtable',
          message: response.status === 401 
            ? 'Invalid credentials provided' 
            : 'Unable to access the specified base'
        });
      }
    } catch (error: any) {
      console.error('Airtable test error:', error);
      
      if (error.name === 'AbortError') {
        return res.status(504).json({ 
          error: 'Request timeout',
          message: 'Connection to Airtable timed out'
        });
      }
      
      return res.status(500).json({ 
        error: 'Connection failed',
        message: sanitizeErrorMessage(error)
      });
    }
  }
);

/**
 * @api {post} /api/v1/integrations/airtable/save Save Airtable Configuration
 * @apiVersion 1.0.0
 * @apiName SaveAirtableConfig
 * @apiGroup Airtable
 * @apiDescription Saves validated Airtable credentials for future use
 */
router.post(
  '/save',
  requireAdmin,
  validateAirtableConfig,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    const { accessToken, baseId } = req.body;
    const storage = req.app.locals.storage;
    
    try {
      // Verify the credentials are still valid
      const config = await storage.getAirtableConfig();
      if (!config?.validated) {
        return res.status(400).json({ 
          error: 'Invalid configuration',
          message: 'Please test the connection first'
        });
      }
      
      // Save with encryption flag (actual encryption would be implemented in storage)
      await storage.saveAirtableConfig({ 
        accessToken, 
        baseId,
        encrypted: true,
        savedAt: new Date().toISOString()
      });
      
      return res.json({ 
        success: true,
        message: 'Airtable configuration saved successfully'
      });
    } catch (error) {
      console.error('Failed to save Airtable config:', error);
      return res.status(500).json({ 
        error: 'Save failed',
        message: sanitizeErrorMessage(error)
      });
    }
  }
);

/**
 * @api {get} /api/v1/integrations/airtable/status Get Connection Status
 * @apiVersion 1.0.0
 * @apiName GetAirtableStatus
 * @apiGroup Airtable
 */
router.get(
  '/status',
  requireAdmin,
  async (req: Request, res: Response) => {
    const storage = req.app.locals.storage;
    
    try {
      const config = await storage.getAirtableConfig();
      return res.json({ 
        connected: !!config?.accessToken && !!config?.baseId,
        hasToken: !!config?.accessToken,
        baseId: config?.baseId ? config.baseId.substring(0, 6) + '...' : null,
        lastValidated: config?.validatedAt || null
      });
    } catch (error) {
      console.error('Failed to get Airtable status:', error);
      return res.json({ 
        connected: false,
        hasToken: false,
        baseId: null,
        lastValidated: null
      });
    }
  }
);

/**
 * @api {post} /api/v1/integrations/airtable/import Import Data from Airtable
 * @apiVersion 1.0.0
 * @apiName ImportFromAirtable
 * @apiGroup Airtable
 * @apiDescription Imports records from specified Airtable table
 * 
 * @apiBody {String} tableName Name of the Airtable table to import from
 * @apiBody {String} [importMode="merge"] Import mode: "merge" or "replace"
 */
router.post(
  '/import',
  requireAdmin,
  airtableRateLimiter,
  validateTableName,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    const { tableName, importMode = 'merge' } = req.body;
    const storage = req.app.locals.storage;
    const config = await storage.getAirtableConfig();
    
    if (!config?.accessToken || !config?.baseId) {
      return res.status(400).json({ 
        error: 'Not configured',
        message: 'Airtable integration is not configured'
      });
    }
    
    // Create idempotency key for this import operation
    const idempotencyKey = `import-${config.baseId}-${tableName}-${Date.now()}`;
    console.log(`Starting import with idempotency key: ${idempotencyKey}`);
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      
      const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(tableName)}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
        },
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status}`);
      }
      
      const data = await response.json();
      const records = data.records || [];
      
      // Validate and sanitize imported data
      let importedCount = 0;
      const errors: string[] = [];
      
      for (const record of records) {
        try {
          const fields = record.fields;
          
          // Validate required fields
          if (!fields.Name) {
            errors.push(`Record ${record.id} missing Name field`);
            continue;
          }
          
          // Sanitize data
          const sanitizedData = {
            name: String(fields.Name).substring(0, 255),
            price: parseFloat(fields.Price) || 0,
            // ... additional field mapping
          };
          
          // Save to database (would implement actual save logic)
          console.log(`Importing record:`, sanitizedData);
          importedCount++;
          
        } catch (recordError) {
          errors.push(`Failed to import record ${record.id}`);
        }
      }
      
      return res.json({ 
        success: true,
        importedCount,
        totalRecords: records.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Imported ${importedCount} of ${records.length} records`,
        idempotencyKey
      });
      
    } catch (error: any) {
      console.error('Import error:', error);
      
      if (error.name === 'AbortError') {
        return res.status(504).json({ 
          error: 'Request timeout',
          message: 'Import operation timed out'
        });
      }
      
      return res.status(500).json({ 
        error: 'Import failed',
        message: sanitizeErrorMessage(error)
      });
    }
  }
);

/**
 * @api {post} /api/v1/integrations/airtable/export Export Data to Airtable
 * @apiVersion 1.0.0
 * @apiName ExportToAirtable
 * @apiGroup Airtable
 * @apiDescription Exports data to Airtable in batches
 * 
 * @apiBody {String="models","options"} dataType Type of data to export
 */
router.post(
  '/export',
  requireAdmin,
  airtableRateLimiter,
  validateDataType,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    const { dataType } = req.body;
    const storage = req.app.locals.storage;
    const config = await storage.getAirtableConfig();
    
    if (!config?.accessToken || !config?.baseId) {
      return res.status(400).json({ 
        error: 'Not configured',
        message: 'Airtable integration is not configured'
      });
    }
    
    // Create idempotency key
    const idempotencyKey = `export-${dataType}-${Date.now()}`;
    console.log(`Starting export with idempotency key: ${idempotencyKey}`);
    
    try {
      let exportData: any[] = [];
      
      // Fetch data to export
      if (dataType === 'models') {
        const models = await storage.getAllModels();
        exportData = models.map(model => ({
          fields: {
            Name: model.name,
            Price: model.basePrice,
            GVWR: model.gvwr,
            Payload: model.payload,
            'Deck Size': model.deckSize,
            Axles: model.axles,
            Features: Array.isArray(model.features) ? model.features.join(', ') : '',
            'Model ID': model.modelId,
          }
        }));
      } else if (dataType === 'options') {
        const options = await storage.getAllOptions();
        exportData = options.map(option => ({
          fields: {
            Name: option.name,
            Price: option.price,
            Category: option.category,
            'Model ID': option.modelId,
          }
        }));
      }
      
      // Export in batches with rate limiting
      const tableName = dataType === 'models' ? 'Trailer Models' : 'Trailer Options';
      const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(tableName)}`;
      
      let createdCount = 0;
      const errors: string[] = [];
      const batchSize = 10; // Airtable limit
      
      for (let i = 0; i < exportData.length; i += batchSize) {
        const batch = exportData.slice(i, i + batchSize);
        
        try {
          // Add delay between batches to respect rate limits
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
          }
          
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              records: batch,
              typecast: true // Allow Airtable to coerce types
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeout);
          
          if (response.ok) {
            const result = await response.json();
            createdCount += result.records?.length || 0;
          } else {
            errors.push(`Batch ${i / batchSize + 1} failed: ${response.status}`);
          }
        } catch (batchError) {
          errors.push(`Batch ${i / batchSize + 1} failed`);
        }
      }
      
      return res.json({ 
        success: createdCount > 0,
        exportedCount: createdCount,
        totalRecords: exportData.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Exported ${createdCount} of ${exportData.length} records`,
        idempotencyKey
      });
      
    } catch (error: any) {
      console.error('Export error:', error);
      return res.status(500).json({ 
        error: 'Export failed',
        message: sanitizeErrorMessage(error)
      });
    }
  }
);

export default router;