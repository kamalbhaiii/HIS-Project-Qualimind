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
};
