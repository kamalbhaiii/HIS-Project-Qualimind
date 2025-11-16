export const authPaths = {
  '/api/auth/signup': {
    post: {
      summary: 'Create a new user account (email + password)',
      description:
        'Registers a new user using email and password. If the email is already registered, a 409 Conflict is returned.',
      tags: ['Auth'],
      requestBody: {
        required: true,
        description: 'User signup payload',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'user@example.com',
                  description: 'Unique email address for the new user.',
                },
                password: {
                  type: 'string',
                  minLength: 8,
                  example: 'Str0ngP@ssw0rd!',
                  description: 'Plain-text password that will be hashed on the server.',
                },
                name: {
                  type: 'string',
                  example: 'Jane Doe',
                  description: 'Optional display name of the user.',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'User account created successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: 'clzv1a9s8000stuvwxyz12345',
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com',
                  },
                  name: {
                    type: 'string',
                    nullable: true,
                    example: 'Jane Doe',
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Bad Request – missing or invalid input.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'email and password are required',
                  },
                },
              },
            },
          },
        },
        409: {
          description: 'Conflict – a user with the given email already exists.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'A user with this email already exists.',
                  },
                },
              },
            },
          },
        },
        500: {
          description: 'Internal Server Error – unexpected error while creating the user.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Internal server error',
                  },
                },
              },
            },
          },
        },
      },
      'x-codeSamples': [
        {
          lang: 'curl',
          label: 'cURL',
          source: `curl -X POST https://api.yourdomain.com/api/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "Str0ngP@ssw0rd!",
    "name": "Jane Doe"
  }'`,
        },
        {
          lang: 'javascript',
          label: 'JavaScript (fetch)',
          source: `fetch("https://api.yourdomain.com/api/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "Str0ngP@ssw0rd!",
    name: "Jane Doe"
  })
})
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);`,
        },
      ],
    },
  },
  '/api/auth/google/url': {
    get: {
      summary: 'Get Google OAuth sign-in URL',
      description:
        'Returns the Google OAuth2 authorization URL. The frontend should redirect the user to this URL to start Google sign-in.',
      tags: ['Auth'],
      responses: {
        200: {
          description: 'Google OAuth URL generated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                    example: 'https://accounts.google.com/o/oauth2/v2/auth?...',
                  },
                },
              },
            },
          },
        },
        500: {
          description: 'Internal Server Error – failed to generate URL.',
        },
      },
    },
  },
  '/api/auth/google/callback': {
    get: {
      summary: 'Google OAuth callback handler',
      description:
        'Exchanges the Google authorization code for tokens, fetches user profile, and creates or updates the user in the database.',
      tags: ['Auth'],
      parameters: [
        {
          name: 'code',
          in: 'query',
          required: true,
          description: 'Authorization code returned by Google after user consent.',
          schema: {
            type: 'string',
          },
        },
      ],
      responses: {
        200: {
          description: 'Google user authenticated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'clzv1a9s8000stuvwxyz12345' },
                      email: { type: 'string', format: 'email', example: 'user@example.com' },
                      name: { type: 'string', nullable: true, example: 'Jane Doe' },
                    },
                  },
                  // token: { type: 'string', example: 'JWT_TOKEN_HERE' } // for later
                },
              },
            },
          },
        },
        400: {
          description: 'Missing or invalid "code" query parameter.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Missing "code" query parameter' },
                },
              },
            },
          },
        },
        500: {
          description: 'Internal Server Error – failed to handle Google sign-in.',
        },
      },
    },
  },
    '/api/auth/login': {
    post: {
      summary: 'Log in with email and password',
      description: 'Authenticates an existing user using email and password and returns a JWT.',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'user@example.com',
                },
                password: {
                  type: 'string',
                  example: 'Str0ngP@ssw0rd!',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Login successful.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string', format: 'email' },
                      name: { type: 'string', nullable: true },
                    },
                  },
                  token: {
                    type: 'string',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Validation error.',
        },
        401: {
          description: 'Invalid email or password.',
        },
        500: {
          description: 'Internal server error.',
        },
      },
    },
  },
};
