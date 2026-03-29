## Future Feature: Import X Bookmark Folders as HAL Tags

### Problem
The bulk import scrapes the "All Bookmarks" page which captures every bookmark but doesn't know which X bookmark folders each tweet belongs to.

### Proposed Solution
After scraping "All Bookmarks", navigate to each individual X bookmark folder page and scrape those too. Map bookmarks to their folder names, then create matching tags (or folders) in HAL automatically.

### Implementation Notes
- X Premium users can create unlimited bookmark folders
- Each folder has its own page at `x.com/i/bookmarks/<folder_id>`
- A bookmark can exist in multiple folders
- The folder list is visible on the main bookmarks page before clicking into "All Bookmarks"
- Would need to: detect folder links on the bookmarks page → navigate to each → scrape → cross-reference post IDs with already-imported bookmarks → create HAL tags/folders and assign them
- Increases import time proportionally to number of folders

### Priority
Low — nice-to-have enhancement. Core import works without it.
