# Kenney Buddy assets

Run from repository root on Windows PowerShell:

powershell -ExecutionPolicy Bypass -File scripts/import_kenney_buddy_assets.ps1

The script downloads and extracts these packs:

- Kenney UI Pack - Adventure
- Kenney Emotes Pack
- Kenney Board Game Icons

After extraction, select the final PNG files and copy or rename them to:

assets/buddy/kenney/ui/buddy_bubble_bg.png
assets/buddy/kenney/ui/buddy_panel.png
assets/buddy/kenney/ui/buddy_button_primary.png
assets/buddy/kenney/ui/buddy_progress_bar.png
assets/buddy/kenney/emotes/buddy_happy.png
assets/buddy/kenney/emotes/buddy_hungry.png
assets/buddy/kenney/emotes/buddy_sleepy.png
assets/buddy/kenney/emotes/buddy_bored.png
assets/buddy/kenney/emotes/buddy_love.png
assets/buddy/kenney/actions/buddy_feed.png
assets/buddy/kenney/actions/buddy_train.png
assets/buddy/kenney/actions/buddy_play.png
assets/buddy/kenney/actions/buddy_clean.png
assets/buddy/kenney/actions/buddy_adventure.png

Current production fallback:

- React Native BuddyCareIcon component
- Android XML widget drawables
- existing BugDex insect art

This keeps the feature releaseable while preventing missing PNG errors.
