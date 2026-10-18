-- Images d'illustration des actus de départ.
-- Ce sont les images de prévisualisation (og:image) publiées par les sites sources eux-mêmes,
-- affichées avec un lien vers l'article. Si l'une d'elles n'existe plus, l'appli affiche un
-- visuel de secours : rien à corriger côté code. Pour changer une image, modifier image_url
-- dans le Table Editor (https obligatoire).
--
-- Non vérifiées depuis l'environnement de développement (réseau restreint) : à contrôler
-- une fois sur un appareil. Aucune image pour l'actu VLR.gg (leur og:image est un logo générique)
-- ni pour l'actu Wikipédia.

update public.news set image_url = 'https://www.team-aaa.com/media/cache/article_big/upload/media/post_image/0001/15/94d14c2edab453f8d73e012d7d9f6a9b3597387d.png'
where source_url = 'https://www.team-aaa.com/fr/actualite/worlds-2026-la-karmine-corp-mvk-play-in_137327';

update public.news set image_url = 'https://esportsadvocate.net/wp-content/uploads/2026/10/esports-government-recap-october-2026.webp'
where source_url = 'https://esportsadvocate.net/2026/10/esports-government-france-ewc-national-pride/';

update public.news set image_url = 'https://e.sport.fr/wp-content/uploads/2026/10/83467f15796d4d624541a6a68f8b1567cf0911c9-1920x1080-1-1024x576.jpg'
where source_url = 'https://www.actu-lan.com/2026/10/05/champions-2026-vitality-en-playoffs-la-karmine-corp-eliminee/';
