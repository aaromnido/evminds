-- Migration 25: Add new YouTube channels (EV-dedicated, all content scraped)
INSERT INTO sources (name, url, feed_url, feed_type, lang, active) VALUES
  ('piltrafilla', 'https://www.youtube.com/@ElTeslaDePiltrafilla', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCRxx9a7cAIQP4cbQAHZlGog', 'youtube', 'es', true),
  ('concachalote', 'https://www.youtube.com/@conCachalote', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCJNiyBDxORcebs-lUxLt32A', 'youtube', 'es', true),
  ('solkuno', 'https://www.youtube.com/@solkuno', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCoV1arBCKiMmvVr3bGmmNow', 'youtube', 'es', true),
  ('macvoltio', 'https://www.youtube.com/@MacVoltioTV', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCaCru32GuiHmoPvuuoF4DQw', 'youtube', 'es', true),
  ('luisvaldes', 'https://www.youtube.com/@LuisValdes_DatosyLetras', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCHcAI2VeE86wiAL3LxeOuKg', 'youtube', 'es', true),
  ('rictorres', 'https://www.youtube.com/@rictorres9', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCvLhYkWWr2kiK-2qvAyJOcw', 'youtube', 'es', true)
ON CONFLICT DO NOTHING;
