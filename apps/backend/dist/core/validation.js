export class ValidationError extends Error {
    details;
    constructor(details) {
        super('Validation failed');
        this.name = 'ValidationError';
        this.details = details;
    }
}
export function validate(schema, data) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const details = result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
        }));
        throw new ValidationError(details);
    }
    return result.data;
}
export function sendValidationError(reply, error) {
    reply.status(400).send({
        detail: 'Validation failed',
        errors: error.details,
    });
}
//# sourceMappingURL=validation.js.map