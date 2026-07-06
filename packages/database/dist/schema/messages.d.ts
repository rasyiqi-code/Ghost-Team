export declare const messages: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "messages";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "messages";
            dataType: "number";
            columnType: "PgSerial";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        userId: import("drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "messages";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        platform: import("drizzle-orm/pg-core").PgColumn<{
            name: "platform";
            tableName: "messages";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 50;
        }>;
        senderId: import("drizzle-orm/pg-core").PgColumn<{
            name: "sender_id";
            tableName: "messages";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 255;
        }>;
        senderName: import("drizzle-orm/pg-core").PgColumn<{
            name: "sender_name";
            tableName: "messages";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 255;
        }>;
        content: import("drizzle-orm/pg-core").PgColumn<{
            name: "content";
            tableName: "messages";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 10000;
        }>;
        messageType: import("drizzle-orm/pg-core").PgColumn<{
            name: "message_type";
            tableName: "messages";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 20;
        }>;
        fileId: import("drizzle-orm/pg-core").PgColumn<{
            name: "file_id";
            tableName: "messages";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        platformMessageId: import("drizzle-orm/pg-core").PgColumn<{
            name: "platform_message_id";
            tableName: "messages";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 255;
        }>;
        isOutgoing: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_outgoing";
            tableName: "messages";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        timestamp: import("drizzle-orm/pg-core").PgColumn<{
            name: "timestamp";
            tableName: "messages";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
//# sourceMappingURL=messages.d.ts.map