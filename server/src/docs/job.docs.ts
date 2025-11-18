// src/modules/jobs/jobs.openapi.ts
export const jobPaths = {
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
          description: 'Processing job ID',
        },
      ],
      responses: {
        200: {
          description: 'Job result (may be null if still running).',
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
        500: { description: 'Internal server error' },
      },
    },
  },

  '/api/jobs/{id}/export': {
    get: {
      summary: 'Export processed result for a job',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Processing job ID',
        },
        {
          name: 'format',
          in: 'query',
          required: true,
          description: 'Export format: json, csv, or txt.',
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
