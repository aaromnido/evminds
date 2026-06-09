-- Add "Coches Eléctricos Org" YouTube channel as a content source.
-- EV-dedicated channel (Spanish), all videos scraped — no keyword filter needed.
INSERT INTO sources (name, url, feed_url, feed_type, lang, active) VALUES
  (
    'cocheselectricos.org',
    'https://www.youtube.com/@coches-electricos',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCC2SrDtYUQsx29Rfr2f_AQQ',
    'youtube',
    'es',
    true
  )
ON CONFLICT DO NOTHING;
