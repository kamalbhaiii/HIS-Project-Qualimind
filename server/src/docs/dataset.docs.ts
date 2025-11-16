export const datasetPaths = {
  '/api/datasets': {
    post: {
      summary: 'Upload a dataset and create a processing job',
      description:
        'Accepts a CSV, JSON, or TXT file, stores it, and creates a pending processing job for the current user.',
      tags: ['Datasets'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'Dataset file (CSV, JSON, or TXT).',
                },
                name: {
                  type: 'string',
                  description: 'Optional display name for the dataset.',
                  example: 'Customer feedback survey – January',
                },
              },
              required: ['file'],
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Dataset created and processing job enqueued (pending).',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'clzv1a9s8000stuvwxyz12345' },
                  name: { type: 'string', example: 'Customer feedback survey – January' },
                  originalName: { type: 'string', example: 'survey_jan.csv' },
                  mimeType: { type: 'string', example: 'text/csv' },
                  sizeBytes: { type: 'integer', example: 123456 },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        400: {
          description: 'Validation error or missing file.',
        },
        401: {
          description: 'Unauthorized – missing or invalid token.',
        },
        415: {
          description: 'Unsupported file type.',
        },
        500: {
          description: 'Internal server error.',
        },
      },
    },
  },
};
