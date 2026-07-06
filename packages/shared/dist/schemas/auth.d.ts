import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const userResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    email: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export declare const tokenResponseSchema: z.ZodObject<{
    access_token: z.ZodString;
    token_type: z.ZodDefault<z.ZodString>;
    user: z.ZodObject<{
        id: z.ZodNumber;
        email: z.ZodString;
        name: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
//# sourceMappingURL=auth.d.ts.map