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
                    example: 'Validation failed',
                  },
                  errors: {
                    type: 'array',
                    items: { type: 'string' },
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

  '/api/auth/verify-email': {
  get: {
    summary: 'Verify user email address',
    description:
      'Verifies a user’s email using a verification token sent via email. Marks the account as emailVerified=true. Also sends a “Account Verified Successfully” confirmation email.',
    tags: ['Auth'],
    parameters: [
      {
        name: 'token',
        in: 'query',
        required: true,
        description: 'Email verification token.',
        schema: {
          type: 'string',
        },
      },
    ],
    responses: {
      200: {
        description: 'Email verified successfully.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Email verified successfully.',
                },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string', nullable: true },
                    emailVerified: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: 'Missing or invalid token.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'Invalid or expired token.' },
              },
            },
          },
        },
      },
      404: {
        description: 'User not found for the given token.',
      },
      409: {
        description: 'Email already verified.',
      },
      500: {
        description: 'Internal server error.',
      },
    },
  },
},


  // -------------------------------------------------------------------
  // AUTHENTICATED USER ENDPOINTS (/me)
  // -------------------------------------------------------------------

  '/api/auth/me': {
    get: {
      summary: 'Get current authenticated user profile',
      description: 'Returns basic profile information for the authenticated user.',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Current user profile.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'clzv1a9s8000stuvwxyz12345' },
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  name: { type: 'string', nullable: true, example: 'Jane Doe' },
                  googleId: { type: 'string', nullable: true, example: '123456789012345678901' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized – missing or invalid token.' },
        404: { description: 'User not found.' },
        500: { description: 'Internal server error.' },
      },
    },

    delete: {
      summary: 'Delete the authenticated user account',
      description:
        'Deletes the authenticated user account and all associated datasets and jobs. Works for both local and Google sign-in users.',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      responses: {
        204: {
          description: 'Account deleted successfully. No content is returned.',
        },
        401: { description: 'Unauthorized – missing or invalid token.' },
        404: { description: 'User not found.' },
        500: { description: 'Internal server error.' },
      },
    },
  },

  '/api/auth/me/name': {
    put: {
      summary: 'Update display name (local accounts only)',
      description:
        'Updates the display name of the authenticated user. This operation is only allowed for users who registered with email/password (non-Google accounts).',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: {
                  type: 'string',
                  example: 'New Name',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Name updated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  name: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        400: {
          description: 'Validation error.',
        },
        401: {
          description: 'Unauthorized – missing or invalid token.',
        },
        403: {
          description: 'Operation not allowed for Google sign-in accounts.',
        },
        404: {
          description: 'User not found.',
        },
        500: {
          description: 'Internal server error.',
        },
      },
    },
  },

  '/api/auth/me/email': {
    put: {
      summary: 'Update email address (local accounts only)',
      description:
        'Updates the email address of the authenticated user. Only allowed for local accounts and requires the current password for confirmation.',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['newEmail', 'currentPassword'],
              properties: {
                newEmail: {
                  type: 'string',
                  format: 'email',
                  example: 'new-email@example.com',
                },
                currentPassword: {
                  type: 'string',
                  example: 'CurrentP@ssw0rd!',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Email updated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  name: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        400: {
          description: 'Validation error.',
        },
        401: {
          description: 'Unauthorized or incorrect current password.',
        },
        403: {
          description: 'Operation not allowed for Google sign-in accounts.',
        },
        409: {
          description: 'Email already in use by another account.',
        },
        404: {
          description: 'User not found.',
        },
        500: {
          description: 'Internal server error.',
        },
      },
    },
  },

  '/api/auth/me/password': {
    put: {
      summary: 'Update password (local accounts only)',
      description:
        'Updates the password for the authenticated user. Only allowed for local accounts and requires the current password.',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['currentPassword', 'newPassword'],
              properties: {
                currentPassword: {
                  type: 'string',
                  example: 'CurrentP@ssw0rd!',
                },
                newPassword: {
                  type: 'string',
                  minLength: 8,
                  example: 'NewStr0ngP@ssw0rd!',
                },
              },
            },
          },
        },
      },
      responses: {
        204: {
          description: 'Password updated successfully. No content is returned.',
        },
        400: {
          description: 'Validation error.',
        },
        401: {
          description: 'Unauthorized or incorrect current password.',
        },
        403: {
          description: 'Operation not allowed for Google sign-in accounts.',
        },
        404: {
          description: 'User not found.',
        },
        500: {
          description: 'Internal server error.',
        },
      },
    },
  },
};
