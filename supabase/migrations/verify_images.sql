-- Verificación de imágenes de ejercicios globales (ejecutar en SQL Editor)
SELECT count(*) AS total_globales FROM public.exercises WHERE is_global = true;
SELECT count(*) AS con_image_url FROM public.exercises WHERE is_global = true AND image_url IS NOT NULL;
SELECT count(*) AS sin_image_url FROM public.exercises WHERE is_global = true AND image_url IS NULL;
SELECT external_id, name, image_url FROM public.exercises WHERE is_global = true ORDER BY name LIMIT 20;
"