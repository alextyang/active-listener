create table if not exists active_listener_tracks (
    track_id text primary key,
    document jsonb not null,
    updated_at timestamptz not null default now(),
    constraint active_listener_tracks_document_object check (jsonb_typeof(document) = 'object')
);
