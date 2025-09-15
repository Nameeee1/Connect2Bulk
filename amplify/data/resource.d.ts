import { type ClientSchema } from '@aws-amplify/backend';
declare const schema: import("@aws-amplify/data-schema").ModelSchema<{
    types: {
        Firm: import("@aws-amplify/data-schema").ModelType<import("@aws-amplify/data-schema-types").SetTypeSubArg<{
            fields: {
                firm_name: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                address: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                city: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                country: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                administrator_email: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                administrator_first_name: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                administrator_last_name: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                state: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                zip: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                firm_type: import("@aws-amplify/data-schema").EnumType<readonly ["Carrier", "Shipper", "Broker", "Other"]>;
                dba: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                dot: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                mc: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                ein: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                phone: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                website: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                insurance_provider: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                policy_number: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                policy_expiry: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                w9_on_file: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<boolean>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.Boolean>;
                brand_color: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                notes: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                load_posts: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<number>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.Integer>;
                truck_posts: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<number>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.Integer>;
            };
            identifier: import("@aws-amplify/data-schema").ModelDefaultIdentifier;
            secondaryIndexes: [];
            authorization: [];
            disabledOperations: [];
        }, "authorization", (import("@aws-amplify/data-schema").Authorization<"public", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
        })[]>, "authorization">;
        User: import("@aws-amplify/data-schema").ModelType<import("@aws-amplify/data-schema-types").SetTypeSubArg<{
            fields: {
                first_name: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                last_name: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                email: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                phone: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                role: import("@aws-amplify/data-schema").EnumType<readonly ["Admin", "Regular"]>;
            };
            identifier: import("@aws-amplify/data-schema").ModelDefaultIdentifier;
            secondaryIndexes: [];
            authorization: [];
            disabledOperations: [];
        }, "authorization", ((import("@aws-amplify/data-schema").Authorization<"public", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
        }) | (import("@aws-amplify/data-schema").Authorization<"private", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
        }))[]>, "authorization">;
        Load: import("@aws-amplify/data-schema").ModelType<import("@aws-amplify/data-schema-types").SetTypeSubArg<{
            fields: {
                load_number: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                pickup_date: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                delivery_date: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                origin: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                destination: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                trailer_type: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                equipment_requirement: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                miles: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<number>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.Integer>;
                rate: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<number>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.Float>;
                frequency: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                comment: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                created_at: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
            };
            identifier: import("@aws-amplify/data-schema").ModelDefaultIdentifier;
            secondaryIndexes: [];
            authorization: [];
            disabledOperations: [];
        }, "authorization", (import("@aws-amplify/data-schema").Authorization<"public", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
        })[]>, "authorization">;
        Truck: import("@aws-amplify/data-schema").ModelType<import("@aws-amplify/data-schema-types").SetTypeSubArg<{
            fields: {
                truck_number: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                available_date: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                origin: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                destination_preference: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                trailer_type: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                equipment: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                length_ft: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<number>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.Integer>;
                weight_capacity: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<number>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.Integer>;
                comment: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                created_at: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
            };
            identifier: import("@aws-amplify/data-schema").ModelDefaultIdentifier;
            secondaryIndexes: [];
            authorization: [];
            disabledOperations: [];
        }, "authorization", (import("@aws-amplify/data-schema").Authorization<"public", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
        })[]>, "authorization">;
    };
    authorization: [];
    configuration: any;
}, never>;
export type Schema = ClientSchema<typeof schema>;
export declare const data: import("@aws-amplify/plugin-types").ConstructFactory<import("@aws-amplify/graphql-api-construct").AmplifyGraphqlApi>;
export {};
