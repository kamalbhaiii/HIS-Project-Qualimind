export const healthPaths = {
    '/api/health': {
        get: {
            summary: 'Health check',
            tags: ['System'],
            responses: {
                200: { description: 'Service is healthy' }
            }
        }
    }
}