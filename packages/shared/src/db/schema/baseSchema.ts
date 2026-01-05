import { relations } from 'drizzle-orm';
import {
    bigint,
    boolean,
    decimal,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    uuid
} from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core/columns/enum';
import { user } from './authSchema';

// Enums

export const imageSource = pgEnum('image_source', ['cssl', 'google', 'unknown']);

export const statusEnum = pgEnum('status_enum', ['pending', 'in_progress', 'complete', 'failed']);
export const serviceStatus = pgEnum('service_status', [
    'pending',
    'uploading',
    'processing',
    'complete',
    'failed'
]);

// 360 Tables

export const paths = pgTable('paths', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').unique().notNull(),
    folderName: text('folder_name').unique().notNull(),
    eventDate: timestamp('event_date').notNull(),
    captureDate: timestamp('capture_date').notNull(),
    status: statusEnum('status').default('pending').notNull(),
    size: bigint('size', { mode: 'number' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    hidden: boolean('hidden').default(false).notNull(),
    updatedAt: timestamp('updated_at')
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
    createdBy: text('created_by')
        .references(() => user.id)
        .notNull(),
    updatedBy: text('updated_by')
        .references(() => user.id)
        .notNull()
});

export const panoramas = pgTable('panoramas', {
    id: text('id').primaryKey(),
    lat: decimal('lat').notNull(),
    lon: decimal('lon').notNull(),
    heading: decimal('heading').notNull(),
    pitch: decimal('pitch'),
    roll: decimal('roll'),
    date: timestamp('date').notNull(),
    elevation: decimal('elevation')
});

export const captures = pgTable('captures', {
    id: uuid('id').defaultRandom().primaryKey(),
    fileName: text('file_name').notNull(),
    source: imageSource('source').default('unknown').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    status: serviceStatus('status').default('pending').notNull(),
    takenAt: timestamp('taken_at').notNull(),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
    lng: decimal('lng').notNull(),
    lat: decimal('lat').notNull(),
    altitude: decimal('altitude'),
    heading: decimal('heading'),
    pitch: decimal('pitch'),
    roll: decimal('roll')
});

export const pathSegments = pgTable('path_segments', {
    id: uuid('id').defaultRandom().primaryKey(),
    index: integer('index').notNull(),
    pathId: uuid('path_id')
        .references(() => paths.id, {
            onDelete: 'cascade'
        })
        .notNull(),
    captureId: uuid('capture_id')
        .references(() => captures.id)
        .notNull(),
    streetViewCaptureId: uuid('street_view_capture_id').references(() => captures.id),
    panoramaId: text('panorama_id').references(() => panoramas.id),
    panoramaStatus: statusEnum('panorama_status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
    hidden: boolean('hidden').default(false).notNull()
});

// Hailgen Tables

export const hailpads = pgTable('hailpads', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').unique().notNull(),
    folderName: text('folder_name').unique().notNull(),
    boxfit: decimal('boxfit').notNull(),
    maxDepth: decimal('max_depth').notNull().default('0'),
    maxDepthLocationX: integer('max_depth_location_x').notNull().default(0),
    maxDepthLocationY: integer('max_depth_location_y').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
    createdBy: text('created_by')
        .references(() => user.id)
        .notNull(),
    updatedBy: text('updated_by')
        .references(() => user.id)
        .notNull(),
    status: statusEnum('status').default('pending').notNull(),
    depthMapStatus: serviceStatus('depth_map_status').default('pending').notNull(),
    analysisStatus: serviceStatus('analysis_status').default('pending').notNull(),
    hidden: boolean('hidden').default(false).notNull()
});

export const dents = pgTable('dents', {
    id: uuid('id').defaultRandom().primaryKey(),
    hailpadId: uuid('hailpad_id')
        .references(() => hailpads.id, {
            onDelete: 'cascade'
        })
        .notNull(),
    angle: decimal('angle'),
    majorAxis: decimal('major_axis').notNull(),
    minorAxis: decimal('minor_axis').notNull(),
    maxDepth: decimal('max_depth').notNull(),
    centroidX: decimal('centroid_x').notNull(),
    centroidY: decimal('centroid_y').notNull()
});

// LiDAR Tables

export const scans = pgTable('scans', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').unique().notNull(),
    size: bigint('size', { mode: 'number' }),
    folderName: text('folder_name').unique().notNull(),
    eventDate: timestamp('event_date').notNull(),
    captureDate: timestamp('capture_date').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
    createdBy: text('created_by')
        .references(() => user.id)
        .notNull(),
    updatedBy: text('updated_by')
        .references(() => user.id)
        .notNull(),
    status: statusEnum('status').default('pending').notNull(),
    hidden: boolean('hidden').default(false).notNull(),
    viewerSettings: jsonb('viewer_settings')
});

// Relations

export const hailpadRelations = relations(hailpads, ({ many, one }) => ({
    author: one(user, {
        fields: [hailpads.createdBy],
        references: [user.id],
        relationName: 'author'
    }),
    editor: one(user, {
        fields: [hailpads.updatedBy],
        references: [user.id],
        relationName: 'editor'
    }),
    dents: many(dents, {
        relationName: 'hailpad'
    })
}));

export const dentRelations = relations(dents, ({ one }) => ({
    hailpad: one(hailpads, {
        fields: [dents.hailpadId],
        references: [hailpads.id],
        relationName: 'hailpad'
    })
}));

export const userRelations = relations(user, ({ many }) => ({
    createdPaths: many(paths, {
        relationName: 'author'
    }),
    createdHailpads: many(hailpads, {
        relationName: 'author'
    }),
    createdScans: many(scans, {
        relationName: 'author'
    }),
    editedPaths: many(paths, {
        relationName: 'editor'
    }),
    editedHailpads: many(hailpads, {
        relationName: 'editor'
    }),
    editedScans: many(scans, {
        relationName: 'editor'
    })
}));

export const pathRelations = relations(paths, ({ one, many }) => ({
    author: one(user, {
        fields: [paths.createdBy],
        references: [user.id],
        relationName: 'author'
    }),
    editor: one(user, {
        fields: [paths.updatedBy],
        references: [user.id],
        relationName: 'editor'
    }),
    segments: many(pathSegments)
}));

export const segmentRelations = relations(pathSegments, ({ one }) => ({
    path: one(paths, {
        fields: [pathSegments.pathId],
        references: [paths.id],
        relationName: 'path'
    }),
    capture: one(captures, {
        fields: [pathSegments.captureId],
        references: [captures.id],
        relationName: 'ntpCaptures'
    }),
    streetView: one(captures, {
        fields: [pathSegments.streetViewCaptureId],
        references: [captures.id],
        relationName: 'googleCaptures'
    }),
    panorama: one(panoramas, {
        fields: [pathSegments.panoramaId],
        references: [panoramas.id],
        relationName: 'panorama'
    })
}));

export const scanRelations = relations(scans, ({ one }) => ({
    author: one(user, {
        fields: [scans.createdBy],
        references: [user.id],
        relationName: 'author'
    }),
    editor: one(user, {
        fields: [scans.updatedBy],
        references: [user.id],
        relationName: 'editor'
    })
}));
