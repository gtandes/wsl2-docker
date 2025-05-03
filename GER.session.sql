TRUNCATE TABLE agencies CASCADE;
TRUNCATE TABLE directus_users CASCADE;
TRUNCATE TABLE directus_migrations CASCADE;
TRUNCATE TABLE directus_permissions CASCADE;
TRUNCATE TABLE directus_roles CASCADE;
TRUNCATE TABLE directus_folders CASCADE;


CREATE SCHEMA IF NOT EXISTS lrsql;


SELECT *
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef NOT LIKE '%UNIQUE%'
ORDER BY tablename, indexname;


SELECT *
FROM pg_indexes
WHERE schemaname = 'public'
  -- AND indexdef NOT LIKE '%UNIQUE%'
ORDER BY tablename, indexname;
