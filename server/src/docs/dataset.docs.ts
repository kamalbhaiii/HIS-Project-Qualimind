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
                  jobId: {
                    type: 'string',
                    example: 'clzv1a9s8000stuvwxyzJOB123',
                    description: 'ID of the processing job associated with this dataset.',
                  },
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

    get: {
      summary: 'List datasets for the current user',
      description: 'Returns all datasets owned by the authenticated user.',
      tags: ['Datasets'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        200: {
          description: 'List of datasets for the current user.',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'clzv1a9s8000stuvwxyz12345' },
                    name: { type: 'string', example: 'Customer feedback survey – January' },
                    originalName: { type: 'string', example: 'survey_jan.csv' },
                    mimeType: { type: 'string', example: 'text/csv' },
                    sizeBytes: { type: 'integer', example: 123456 },
                    createdAt: { type: 'string', format: 'date-time' },
                    jobId: {
                      type: 'string',
                      example: 'clzv1a9s8000stuvwxyzJOB123',
                      description: 'ID of the most recent processing job associated with this dataset.',
                    },
                  },
                },
              },
            },
          },
        },
        401: {
          description: 'Unauthorized – missing or invalid token.',
        },
        500: {
          description: 'Internal server error.',
        },
      },
    },
  },

  '/api/datasets/{id}': {
    get: {
      summary: 'Get a specific dataset',
      description: 'Returns details for a single dataset owned by the authenticated user.',
      tags: ['Datasets'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID of the dataset.',
          schema: {
            type: 'string',
            example: 'clzv1a9s8000stuvwxyz12345',
          },
        },
      ],
      responses: {
        200: {
          description: 'Dataset found.',
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
                  jobId: {
                    type: 'string',
                    example: 'clzv1a9s8000stuvwxyzJOB123',
                    description: 'ID of the most recent processing job associated with this dataset.',
                  },
                },
              },
            },
          },
        },
        401: {
          description: 'Unauthorized – missing or invalid token.',
        },
        404: {
          description: 'Dataset not found.',
        },
        500: {
          description: 'Internal server error.',
        },
      },
    },

    patch: {
      summary: 'Update a dataset',
      description:
        'Update metadata for a dataset owned by the authenticated user. Currently only supports renaming the dataset.',
      tags: ['Datasets'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID of the dataset to update.',
          schema: {
            type: 'string',
            example: 'clzv1a9s8000stuvwxyz12345',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'New display name for the dataset.',
                  example: 'Customer feedback survey – February',
                },
              },
              required: ['name'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Dataset successfully updated.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'clzv1a9s8000stuvwxyz12345' },
                  name: { type: 'string', example: 'Customer feedback survey – February' },
                  originalName: { type: 'string', example: 'survey_jan.csv' },
                  mimeType: { type: 'string', example: 'text/csv' },
                  sizeBytes: { type: 'integer', example: 123456 },
                  createdAt: { type: 'string', format: 'date-time' },
                  jobId: {
                    type: 'string',
                    example: 'clzv1a9s8000stuvwxyzJOB123',
                    description: 'ID of the most recent processing job associated with this dataset.',
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Validation error (e.g., missing name).',
        },
        401: {
          description: 'Unauthorized – missing or invalid token.',
        },
        404: {
          description: 'Dataset not found.',
        },
        500: {
          description: 'Internal server error.',
        },
      },
    },

    delete: {
      summary: 'Delete a dataset',
      description:
        'Deletes a dataset (and its associated processing jobs) owned by the authenticated user.',
      tags: ['Datasets'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID of the dataset to delete.',
          schema: {
            type: 'string',
            example: 'clzv1a9s8000stuvwxyz12345',
          },
        },
      ],
      responses: {
        204: {
          description: 'Dataset deleted successfully. No content is returned.',
        },
        401: {
          description: 'Unauthorized – missing or invalid token.',
        },
        404: {
          description: 'Dataset not found.',
        },
        500: {
          description: 'Internal server error.',
        },
      },
    },
  },
};
