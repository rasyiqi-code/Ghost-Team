import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const db = prisma.$extends({
    query: {
        user: {
            async findFirst({ args, query }) {
                const where = args.where;
                if (where && where.id) {
                    if (typeof where.id === 'string') {
                        where.id = parseInt(where.id, 10);
                    }
                    else if (where.id.equals && typeof where.id.equals === 'string') {
                        where.id.equals = parseInt(where.id.equals, 10);
                    }
                }
                return query(args);
            },
            async findUnique({ args, query }) {
                const where = args.where;
                if (where && where.id) {
                    if (typeof where.id === 'string') {
                        where.id = parseInt(where.id, 10);
                    }
                    else if (where.id.equals && typeof where.id.equals === 'string') {
                        where.id.equals = parseInt(where.id.equals, 10);
                    }
                }
                return query(args);
            },
            async update({ args, query }) {
                const where = args.where;
                if (where && where.id) {
                    if (typeof where.id === 'string') {
                        where.id = parseInt(where.id, 10);
                    }
                    else if (where.id.equals && typeof where.id.equals === 'string') {
                        where.id.equals = parseInt(where.id.equals, 10);
                    }
                }
                return query(args);
            },
            async delete({ args, query }) {
                const where = args.where;
                if (where && where.id) {
                    if (typeof where.id === 'string') {
                        where.id = parseInt(where.id, 10);
                    }
                    else if (where.id.equals && typeof where.id.equals === 'string') {
                        where.id.equals = parseInt(where.id.equals, 10);
                    }
                }
                return query(args);
            }
        },
        account: {
            async create({ args, query }) {
                const data = args.data;
                if (data && typeof data.userId === 'string') {
                    data.userId = parseInt(data.userId, 10);
                }
                return query(args);
            },
            async update({ args, query }) {
                const data = args.data;
                if (data && typeof data.userId === 'string') {
                    data.userId = parseInt(data.userId, 10);
                }
                return query(args);
            },
            async upsert({ args, query }) {
                const create = args.create;
                if (create && typeof create.userId === 'string') {
                    create.userId = parseInt(create.userId, 10);
                }
                const update = args.update;
                if (update && typeof update.userId === 'string') {
                    update.userId = parseInt(update.userId, 10);
                }
                return query(args);
            }
        },
        session: {
            async create({ args, query }) {
                const data = args.data;
                if (data && typeof data.userId === 'string') {
                    data.userId = parseInt(data.userId, 10);
                }
                return query(args);
            },
            async update({ args, query }) {
                const data = args.data;
                if (data && typeof data.userId === 'string') {
                    data.userId = parseInt(data.userId, 10);
                }
                return query(args);
            },
            async upsert({ args, query }) {
                const create = args.create;
                if (create && typeof create.userId === 'string') {
                    create.userId = parseInt(create.userId, 10);
                }
                const update = args.update;
                if (update && typeof update.userId === 'string') {
                    update.userId = parseInt(update.userId, 10);
                }
                return query(args);
            }
        }
    }
});
//# sourceMappingURL=client.js.map