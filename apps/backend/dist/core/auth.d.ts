export declare const auth: import("better-auth").Auth<{
    database: (options: import("better-auth").BetterAuthOptions) => import("better-auth").DBAdapter<import("better-auth").BetterAuthOptions>;
    trustedOrigins: string[];
    advanced: {
        database: {
            generateId: (options: {
                model: string;
            }) => false | `${string}-${string}-${string}-${string}-${string}`;
        };
    };
    emailAndPassword: {
        enabled: true;
    };
    plugins: [{
        id: "bearer";
        version: string;
        hooks: {
            before: {
                matcher(context: import("better-auth").HookEndpointContext): boolean;
                handler: (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    context: {
                        headers: Headers;
                    };
                } | undefined>;
            }[];
            after: {
                matcher(context: import("better-auth").HookEndpointContext): true;
                handler: (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<void>;
            }[];
        };
        options: import("better-auth/plugins").BearerOptions | undefined;
    }];
}>;
//# sourceMappingURL=auth.d.ts.map