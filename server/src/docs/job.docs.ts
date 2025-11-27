export const jobPaths = {
  // ---------------------------------------------------------
  // CREATE JOB
  // ---------------------------------------------------------
  '/api/jobs': {
    post: {
      summary: 'Create a new processing job for a dataset',
      description:
        'Creates a new job for a dataset owned by the authenticated user. Optionally triggers preprocessing.',
      tags: ['Jobs'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                datasetId: {
                  type: 'string',
                  description: 'Dataset ID to create a job for',
                },
              },
              required: ['datasetId'],
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Job created successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/JobResponse',
              },
            },
          },
        },
        400: { description: 'Missing datasetId' },
        401: { description: 'Unauthorized' },
        404: { description: 'Dataset not found' },
        500: { description: 'Internal server error' },
      },
    },

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
  // GET / PATCH / DELETE job by ID
  // ---------------------------------------------------------
  '/api/jobs/{id}': {
    get: {
      summary: 'Get a processing job by ID',
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
          description: 'Job details',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/JobResponse' },
            },
          },
        },
        401: { description: 'Unauthorized' },
        404: { description: 'Job not found' },
      },
    },

    patch: {
      summary: 'Update job status or error message',
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
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'],
                },
                errorMessage: {
                  type: 'string',
                  nullable: true,
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Job updated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/JobResponse' },
            },
          },
        },
        400: { description: 'Missing fields' },
        401: { description: 'Unauthorized' },
        404: { description: 'Job not found' },
      },
    },

    delete: {
      summary: 'Delete a job',
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
        204: { description: 'Job deleted successfully' },
        401: { description: 'Unauthorized' },
        404: { description: 'Job not found' },
      },
    },
  },

  // ---------------------------------------------------------
  // JOB STATUS
  // ---------------------------------------------------------
  '/api/jobs/{id}/status': {
    get: {
      summary: 'Get processing job status',
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
          description: 'Job status object',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  errorMessage: { type: 'string', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  startedAt: { type: 'string', format: 'date-time', nullable: true },
                  completedAt: { type: 'string', format: 'date-time', nullable: true },
                  datasetId: { type: 'string' },
                  datasetName: { type: 'string' },
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
