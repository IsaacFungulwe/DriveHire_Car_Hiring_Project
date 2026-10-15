WITH ranked_roles AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE role
          WHEN 'admin' THEN 1
          WHEN 'owner' THEN 2
          ELSE 3
        END,
        created_at,
        id
    ) AS role_rank
  FROM public.user_roles
)
DELETE FROM public.user_roles AS roles
USING ranked_roles
WHERE roles.id = ranked_roles.id
  AND ranked_roles.role_rank > 1;

CREATE UNIQUE INDEX user_roles_user_id_key ON public.user_roles (user_id);
