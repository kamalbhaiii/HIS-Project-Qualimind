export const jobPaths = {
  '/api/jobs': {
    // ---------------------------------------------------------
    // LIST JOBS
    // ---------------------------------------------------------
    get: {
      summary: 'List all processing jobs for the authenticated user',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'List of jobs',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/JobResponse' },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        500: { description: 'Internal server error' },
      },
    },
  },
  // ---------------------------------------------------------
  // JOB RESULT
  // ---------------------------------------------------------
  '/api/jobs/{id}/result': {
    get: {
      summary: 'Get processed result for a job',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: {
          description: 'Job result (may be null if still running)',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  jobId: { type: 'string' },
                  status: { type: 'string', example: 'SUCCESS' },
                  result: { type: 'object', nullable: true },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        404: { description: 'Job not found' },
      },
    },
  },

  // ---------------------------------------------------------
  // JOB EXPORT
  // ---------------------------------------------------------
  '/api/jobs/{id}/export': {
    get: {
      summary: 'Export job result as CSV, JSON, or TXT',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
        {
          name: 'format',
          in: 'query',
          required: true,
          schema: {
            type: 'string',
            enum: ['json', 'csv', 'txt'],
          },
        },
      ],
      responses: {
        200: {
          description: 'File download with processed result.',
          content: {
            'application/json': {},
            'text/csv': {},
            'text/plain': {},
          },
        },
        400: { description: 'Invalid format or missing parameter' },
        401: { description: 'Unauthorized' },
        404: { description: 'Job not found' },
        409: { description: 'Result not available yet' },
        500: { description: 'Internal server error' },
      },
    },
  },
};

// ---------------------------------------------------------
// COMPONENT SCHEMA
// ---------------------------------------------------------
export const jobComponents = {
  JobResponse: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      datasetId: { type: 'string' },
      datasetName: { type: 'string' },
      status: { type: 'string', enum: ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'] },
      errorMessage: { type: 'string', nullable: true },
      resultKey: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      startedAt: { type: 'string', format: 'date-time', nullable: true },
      completedAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
};
