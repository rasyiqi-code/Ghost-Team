import type { ZodSchema } from 'zod';
import type { FastifyReply } from 'fastify';
export declare class ValidationError extends Error {
    details: {
        path: string;
        message: string;
    }[];
    constructor(details: {
        path: string;
        message: string;
    }[]);
}
export declare function validate<T>(schema: ZodSchema<T>, data: unknown): T;
export declare function sendValidationError(reply: FastifyReply, error: ValidationError): void;
//# sourceMappingURL=validation.d.ts.map