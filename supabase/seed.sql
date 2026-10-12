-- Starter catalog. Edit freely from Admin → Catalog later.
-- Hindi/Punjabi names should be reviewed by a native speaker before launch.

insert into public.categories (slug, name_en, name_hi, name_pa, sort) values
  ('iron-steel',  'Iron & Steel',        'लोहा / स्टील',       'ਲੋਹਾ / ਸਟੀਲ',        10),
  ('non-ferrous', 'Copper, Brass & Aluminium', 'तांबा, पीतल, एल्युमिनियम', 'ਤਾਂਬਾ, ਪਿੱਤਲ, ਐਲੂਮੀਨੀਅਮ', 20),
  ('cloth',       'Cloth & Hosiery (Katran)', 'कपड़ा कतरन',      'ਕੱਪੜਾ ਕਤਰਨ',          30),
  ('paper',       'Cardboard & Paper',   'गत्ता / कागज़',       'ਗੱਤਾ / ਕਾਗਜ਼',         40),
  ('plastic',     'Plastic',             'प्लास्टिक',           'ਪਲਾਸਟਿਕ',            50),
  ('other',       'Other Scrap',         'अन्य स्क्रैप',         'ਹੋਰ ਸਕ੍ਰੈਪ',           90)
on conflict (slug) do nothing;

insert into public.grades (category_id, slug, name_en, name_hi, name_pa, unit, sort)
select c.id, g.slug, g.name_en, g.name_hi, g.name_pa, g.unit, g.sort
from (values
  ('iron-steel',  'hms-1',            'HMS-1 (Heavy Melting)',   'HMS-1 (भारी मेल्टिंग)',   'HMS-1 (ਭਾਰੀ ਮੈਲਟਿੰਗ)',   'kg', 10),
  ('iron-steel',  'hms-2',            'HMS-2',                   'HMS-2',                    'HMS-2',                    'kg', 20),
  ('iron-steel',  'crc-cutting',      'CRC / Sheet Cutting',     'CRC / शीट कटिंग',          'CRC / ਸ਼ੀਟ ਕਟਿੰਗ',         'kg', 30),
  ('iron-steel',  'turning-boring',   'Turning & Boring',        'टर्निंग / बोरिंग (बुरादा)', 'ਟਰਨਿੰਗ / ਬੋਰਿੰਗ (ਬੁਰਾਦਾ)', 'kg', 40),
  ('iron-steel',  'cast-iron',        'Cast Iron (CI)',          'कास्ट आयरन (ढलवां लोहा)',  'ਕਾਸਟ ਆਇਰਨ',               'kg', 50),
  ('iron-steel',  'melting-mix',      'Mixed Melting Scrap',     'मिक्स मेल्टिंग स्क्रैप',    'ਮਿਕਸ ਮੈਲਟਿੰਗ ਸਕ੍ਰੈਪ',      'kg', 60),
  ('non-ferrous', 'copper',           'Copper',                  'तांबा',                    'ਤਾਂਬਾ',                    'kg', 10),
  ('non-ferrous', 'brass',            'Brass',                   'पीतल',                     'ਪਿੱਤਲ',                    'kg', 20),
  ('non-ferrous', 'aluminium',        'Aluminium',               'एल्युमिनियम',              'ਐਲੂਮੀਨੀਅਮ',               'kg', 30),
  ('non-ferrous', 'ss-304',           'Stainless Steel 304',     'स्टेनलेस स्टील 304',       'ਸਟੇਨਲੈੱਸ ਸਟੀਲ 304',       'kg', 40),
  ('cloth',       'cotton-white',     'Cotton Katran – White',   'कॉटन कतरन – सफ़ेद',         'ਕਾਟਨ ਕਤਰਨ – ਚਿੱਟੀ',        'kg', 10),
  ('cloth',       'cotton-colour',    'Cotton Katran – Coloured','कॉटन कतरन – रंगीन',         'ਕਾਟਨ ਕਤਰਨ – ਰੰਗਦਾਰ',       'kg', 20),
  ('cloth',       'polyester',        'Polyester / Synthetic Katran', 'पॉलिएस्टर कतरन',      'ਪੋਲੀਐਸਟਰ ਕਤਰਨ',           'kg', 30),
  ('cloth',       'woollen',          'Woollen Katran',          'ऊनी कतरन',                 'ਊਨੀ ਕਤਰਨ',                'kg', 40),
  ('cloth',       'mixed-cloth',      'Mixed Cloth Waste',       'मिक्स कपड़ा वेस्ट',          'ਮਿਕਸ ਕੱਪੜਾ ਵੇਸਟ',          'kg', 50),
  ('paper',       'occ',              'Cartons / OCC',           'गत्ता डिब्बा (OCC)',        'ਗੱਤਾ ਡੱਬਾ (OCC)',          'kg', 10),
  ('paper',       'mixed-paper',      'Mixed Paper / Duplex',    'मिक्स कागज़ / डुप्लेक्स',    'ਮਿਕਸ ਕਾਗਜ਼ / ਡੁਪਲੈਕਸ',     'kg', 20),
  ('plastic',     'hdpe',             'HDPE',                    'HDPE',                     'HDPE',                     'kg', 10),
  ('plastic',     'ldpe-film',        'LDPE Film / Polythene',   'LDPE फिल्म / पॉलीथीन',     'LDPE ਫਿਲਮ / ਪੋਲੀਥੀਨ',     'kg', 20),
  ('plastic',     'pp',               'PP',                      'PP',                       'PP',                       'kg', 30),
  ('plastic',     'pet',              'PET Bottles',             'PET बोतलें',               'PET ਬੋਤਲਾਂ',              'kg', 40),
  ('other',       'rubber',           'Rubber / Tyre',           'रबड़ / टायर',               'ਰਬੜ / ਟਾਇਰ',               'kg', 10),
  ('other',       'wood-pallet',      'Wood / Pallets',          'लकड़ी / पैलेट',             'ਲੱਕੜ / ਪੈਲੇਟ',              'kg', 20)
) as g(cat, slug, name_en, name_hi, name_pa, unit, sort)
join public.categories c on c.slug = g.cat
on conflict (slug) do nothing;
